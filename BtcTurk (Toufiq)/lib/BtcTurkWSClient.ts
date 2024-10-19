import { WebSocket } from 'ws'
import {
    BtcTurkTradeListItem,
    BtcTurkOrderBookResult,
    BtcTurkTicker
} from './types'
import {
    createWSSubscribeMsg,
    BtcTurk_WS_TYPE,
    BTCTURK_WS_URL,
    createWSLoginMsg
} from './utils'

export type BtcTurkWSSubscribeParams = {
    channel: string, // eg: 'ticker'
    event: string,   // eg: 'BTCUSDT'
    onResult: (result: any) => void,
    onError?: (error: Error) => void
    type: number, // expect result type. eg: 401
}

export interface IBtcTurkWSClient {
    connected: Boolean
    connecting: Boolean
    reconnectDelayMS: number
    socket: any

    connect: (
        onMessage?: (e: any) => void,
        onReconnect?: () => void
    ) => Promise<Boolean>

    subscribe: (params: BtcTurkWSSubscribeParams) => any

    subscribeBatch: (allParams: BtcTurkWSSubscribeParams[]) => void

    unsubscribeAll: () => void
}

export class BtcTurkWSClient implements IBtcTurkWSClient {
    // subscription callbacks
    protected callbacks = new Map<
        string, // channel:event:type
        ((result: any) => void)[] // 'channel:event' callbacks
    >()
    public connected = false
    public connecting = false
    protected connectionPromise: Promise<Boolean> | null = null
    protected reconnectTimeoutId: any
    public socket: WebSocket | null = null
    protected unsubscribers = new Map<string, () => void>()

    constructor(
        public reconnectDelayMS = 5000,
        protected logger?: any,
        protected onMessage?: (e: any) => void
    ) { }

    public connect = (
        onMessage?: (e: any) => void,
        onReconnect?: () => void
    ) => {
        this.connectionPromise = new Promise<Boolean>((resolve, reject) => {
            // reuse existing connection
            if (this.socket && this.socket.readyState === WebSocket.OPEN) return resolve(true)
            // close existing connection
            if (this.socket) this.socket.close()

            // clear reconnect timeout to avoid creating unnecessary connections
            clearTimeout(this.reconnectTimeoutId)
            this.connecting = true
            this.socket = new WebSocket(BTCTURK_WS_URL)

            // handle websocket close event
            this.socket.on('close', (code: any, reason: any) => {
                this.connecting = false
                this.logger?.log?.(`Websocket connection closed: ${code} - ${reason}`)

                this.reconnectTimeoutId = setTimeout(() => {
                    this.logger?.log?.('Attempting to reconnect...')
                    this.connect(onMessage, onReconnect)
                        // re-establish to all existing subscriptions
                        .then(ok => {
                            if (!ok) return

                            onReconnect?.()
                            this.subscribeBatch(
                                [...this.callbacks]
                                    .map(([key, callbacks]) => {
                                        const [
                                            channel,
                                            event,
                                            type
                                        ] = key.split(':')

                                        return callbacks.map(onResult => ({
                                            channel,
                                            event,
                                            type: Number(type),
                                            onResult
                                        }))
                                    })
                                    .flat()
                            )
                        })
                        .catch(err => this.logger?.log?.(`Reconnect failed: ${err}`))
                }, this.reconnectDelayMS)
            })

            // handle websocket errors
            this.socket.on('error', (error: Error) => {
                this.logger?.log?.(`WebSocket error: ${error.toString()}`);
                reject(error)
            })

            // handle websocket connection opened
            this.socket.on('open', () => {
                this.connecting = false
                resolve(true)
            })

            // handle all messages received from server
            this.socket.onmessage = (e: any) => {
                onMessage?.(e)
                this.onMessage?.call(this, e)
                let [msgType, data] = JSON.parse(e.data as string) as [number, any]
                const {
                    channel,
                    event,
                    type
                } = data
                const key = this.getCallbackKey(
                    channel,
                    event,
                    type
                )
                const callbacks = this.callbacks.get(key)
                callbacks?.forEach(callback => callback?.(data))

                !callbacks?.length
                    && ![
                        99, // on connection message
                        100 // on subscribe message
                    ].includes(msgType)
                    && this.logger?.log?.(
                        `No handler for message: Channel ${channel} | Event ${event} | Type ${type}`
                    )

                // const channelName = Object.keys(BtcTurk_WS_TYPE)[
                //     Object.values(BtcTurk_WS_TYPE).indexOf(type)
                // ]
                // switch (type) {
                //     case BtcTurk_WS_TYPE.UserLoginRequest:
                //         // user login
                //         const { ok, message } = data

                //         break
                //     case BtcTurk_WS_TYPE.TradeSingle:
                //         // console.log('TradeSingle', data as BtcTurkTradeSingle)
                //         break
                //     case BtcTurk_WS_TYPE.TradeSingleList:
                //         const items = data.items as BtcTurkTradeListItem[]
                //         const lastItem = items
                //             .sort((a, b) => Number(a.D) - Number(b.D))
                //             .slice(-1)[0]
                //         // console.log(typeName, { lastItem })
                //         data = lastItem
                //         break
                //     case BtcTurk_WS_TYPE.OrderBookFull:
                //         data = data as BtcTurkOrderBookResult
                //         break
                //     case BtcTurk_WS_TYPE.TickerPair:
                //         // console.log(typeName, data)
                //         break
                //     case BtcTurk_WS_TYPE.Result:
                //         // const { ok, message } = data as { ok: boolean, message: string }
                //         // if (!ok) break
                //         // if (message.includes('join|')) console.log('joined', message.split('|')[1], message)
                //         break
                //     default:
                // }
            }
        })
        return this.connectionPromise
    }

    private getCallbackKey = (
        channel: string = '',
        event: string = '',
        type: number = -1
    ) => `${channel}:${event}:${type}`

    /**
     * @name    subscribe
     * @summary subscribe to events
     * 
     * @param {BtcTurkWSSubscribeParams} params
     * 
     * @returns {Function|undefined} unsubscribe function
     */
    public subscribe = ({
        channel,
        event,
        type,
        onResult,
        onError,
    }: BtcTurkWSSubscribeParams): any => {
        if (!onResult) return
        if (!this.socket?.OPEN) throw new Error('Please ensure websocket is connected before subscribing')

        const key = this.getCallbackKey(
            channel,
            event,
            type
        )
        const callbacks = this.callbacks.get(key) || []
        // avoid duplication subscriptions
        if (callbacks.includes(onResult)) return

        // return function to unsbuscribe from the channel+event
        const unsubscribe = () => {
            // send a message to server to unsubscribe
            this.socket?.send(
                createWSSubscribeMsg(
                    channel,
                    event,
                    false
                )
            )
            // remove onResult callback from the list
            const cbs = this.callbacks.get(key) || []
            const index = cbs.indexOf(onResult)
            cbs.splice(index, 1)
            this.callbacks.set(key, cbs)
        }

        this.callbacks.set(key, [...callbacks, onResult])

        this.socket?.send(createWSSubscribeMsg(channel, event, true), err => {
            err && onError?.(err)
        })

        this.unsubscribers.set(key, unsubscribe)
        return unsubscribe
    }

    /**
     * @name    subscribeBatch
     * @summary batch subscribe to multiple channels
     * 
     * @param   {BtcTurkWSSubscribeParams[]} batchParams 
     * 
     * @returns {Function[]} functions to unsubscribe
     */
    public subscribeBatch = (batchParams: BtcTurkWSSubscribeParams[]): (() => void)[] => batchParams
        .map(params => this.subscribe(params))

    /**
     * @name    unsubscribeAll
     * @summary unsubscribe from all subscriptions
     */
    public unsubscribeAll = () => [...this.unsubscribers.values()]
        .forEach(unsubscribe => unsubscribe())
}
export default BtcTurkWSClient