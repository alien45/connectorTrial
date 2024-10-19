import {
    ConnectorConfiguration, // { quoteAsset: string }
    ConnectorGroup, // { name: string }
    Credential, // { key: string, secret: string }
    PublicExchangeConnector,
    Serializable,
    SklEvent,
    Ticker,
    TopOfBook,
    Trade,
} from '../../types' //'skl-shared'?
import { getSklSymbol } from '../../util/config'
import { Logger } from '../../util/logging'
import { CONNECTOR_TYPE, getBtcTurkSymbol } from './btcturk-spot'
import { BtcTurkWSClient, BtcTurkWSPrivateClient } from './lib'
import {
    BtcTurkOrderBookItem,
    BtcTurkOrderBookResult,
    BtcTurkTicker,
    BtcTurkTickerResult,
    BtcTurkTradeListItem,
    BtcTurkTradeSingle
} from './lib/types'
import { BtcTurk_WS_TYPE } from './lib/utils'

const logger = Logger.getInstance('btcturk-spot-public-connector')

type OnMessage = (messages: Serializable[]) => void

export class BtcTurkSpotPublicConnector implements PublicExchangeConnector {
    private btcTurkWSClient: BtcTurkWSClient | BtcTurkWSPrivateClient

    public publicWebsocketUrl = 'wss://ws-feed-pro.btcturk.com'
    public restUrl = 'https://kripto.btcturk.com/en/account/api-access'
    public websocket: any
    private exchangeSymbol: string
    private sklSymbol: string
    public asks: BtcTurkOrderBookItem[] = []
    public bids: BtcTurkOrderBookItem[] = []

    constructor(
        private group: ConnectorGroup,
        private config: ConnectorConfiguration,
        private credential?: Credential, // BtcTurk public connection does not require any authentication
    ) {
        this.btcTurkWSClient = !!this.credential
            ? new BtcTurkWSPrivateClient(
                this.credential.key,
                this.credential.secret,
                3000,
                logger
            )
            : new BtcTurkWSClient(3000, logger)
        this.exchangeSymbol = getBtcTurkSymbol(this.group, this.config)
        this.sklSymbol = getSklSymbol(this.group, this.config)
    }

    public connect = async (onMessage: OnMessage): Promise<void> => this.btcTurkWSClient
        .connect()
        .then(async connected => {
            if (!connected) return

            const ok = !this.credential
                || await (this.btcTurkWSClient as BtcTurkWSPrivateClient).login()
            // BtcTurkWSClient will auto re-subscribe on auto-reconnect
            ok && this.subscribeToChannels(onMessage)
        })

    //  not necessary as it is already handled by the subscribeToChannels()
    // private createSerializableEvents(eventType: SklEvent, message: any): Serializable[] {
    //     return []
    // }

    private createTicker = (ticker: BtcTurkTicker): Ticker => ({
        symbol: this.sklSymbol,
        connectorType: CONNECTOR_TYPE,
        event: 'Ticker',
        lastPrice: parseFloat(ticker.LA),
        timestamp: new Date().getTime(), // No timestamp supplied by the API. Using current time
    })

    private createTopOfBook = (orderbook: BtcTurkOrderBookResult, group: ConnectorGroup): TopOfBook => ({
        symbol: this.sklSymbol,
        connectorType: CONNECTOR_TYPE,
        event: 'TopOfBook',
        timestamp: new Date().getTime(), // No timestamp supplied by the API. Using current time
        askPrice: parseFloat(orderbook.AO[0].P),
        askSize: parseFloat(orderbook.AO[0].A),
        bidPrice: parseFloat(orderbook.BO[0].P),
        bidSize: parseFloat(orderbook.BO[0].A),
    })

    private createTrade = (trade: BtcTurkTradeListItem): Trade | null => ({
        symbol: this.sklSymbol,
        connectorType: CONNECTOR_TYPE,
        event: 'Trade',
        price: parseFloat(trade.P),
        size: parseFloat(trade.A),
        side: trade.S
            ? 'Buy'
            : 'Sell',
        timestamp: new Date(trade.D).getTime(),
    })

    //  not necessary as it is already handled by the subscribeToChannels()
    // private getEventType(message: any): SklEvent | null {
    // }

    /**
     * @name    stop
     * @summary cancel all subscriptions and close websocket connection
     */
    public stop = () => this.btcTurkWSClient.stop()

    private subscribeToChannels(onMessage: OnMessage): void {
        this.btcTurkWSClient.subscribeBatch([
            {
                channel: 'trade',
                event: this.exchangeSymbol, // eg: "BTCUSDT"
                type: BtcTurk_WS_TYPE.TradeSingle,
                onResult: (trade: BtcTurkTradeSingle) => {
                    const serializableMessages: Serializable[] = [this.createTrade(trade)]
                    onMessage(serializableMessages)
                }
            },
            {
                channel: 'ticker',
                event: this.exchangeSymbol, // eg: "BTCUSDT"
                type: BtcTurk_WS_TYPE.TickerPair,
                onResult: (ticker: BtcTurkTickerResult) => {
                    const serializableMessages: Serializable[] = [this.createTicker(ticker)]
                    onMessage(serializableMessages)
                }
            },
            {
                channel: 'orderbook',
                event: this.exchangeSymbol, // eg: "BTCUSDT"
                type: BtcTurk_WS_TYPE.OrderBookFull,
                onResult: (orderbook: BtcTurkOrderBookResult) => {
                    this.asks = orderbook.AO
                    this.bids = orderbook.BO
                    const serializableMessages: Serializable[] = [this.createTopOfBook(orderbook, this.group)]
                    onMessage(serializableMessages)
                }
            }
        ])
    }
}