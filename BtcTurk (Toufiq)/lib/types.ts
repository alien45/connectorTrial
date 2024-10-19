export type BtcTurkAsset = {
    asset: string,// 'KAVA',
    assetname: string,// 'Kava',
    balance: string,// '0',
    locked: string,// '0',
    free: string,// '0',
    orderFund: string,// '0',
    requestFund: string,// '0',
    precision: string,// 4
}

/**
 * 
 * @param {string}  D   timestamp  (int)
 * @param {string}  I   pair-specific unique trade ID
 * @param {string}  A   amount
 * @param {string}  P   price
 * @param {0|1}     S   side: 0: buy, 1: sell
 */
export type BtcTurkTradeListItem = {
    D: string,
    I: string,
    A: string,
    P: string,
    S: 0 | 1,
}

export type BtcTurkTradeSingle = BtcTurkTradeListItem & {
    channel: string,
    event: string, // pair symbol. eg: BTCUSDT
    type: string, // channel ID
}

/**
 * @param   {String} A amount
 * @param   {String} P price
 */
export type BtcTurkOrderBookItem = {
    A: string, // amount
    P: string, // price
}

/**
 * @param   {BtcTurkOrderBookItem[]} AO sale orders/asks
 * @param   {BtcTurkOrderBookItem[]} BO purchase order/bids
 */
export type BtcTurkOrderBookResult = {
    CS: number, // change set. sequential number
    PS: string, // pair symbol
    AO: BtcTurkOrderBookItem[], // sales orders
    BO: BtcTurkOrderBookItem[], // purchase orders
}

/**
 * @param   {String}    La price of the last transaction
 */
export type BtcTurkTicker = {
    B: string,
    A: string,
    BA: string,
    AA: string,
    PS: string,
    H: string,
    L: string,
    LA: string,
    O: string,
    V: string,
    AV: string,
    D: string,
    DP: string,
    DS: string,
    NS: string,
    PId: number,
    channel: string,
    event: string,
    type: number
}

export type BtcTurkTickerResult = BtcTurkTicker & {
    channel: string,
    event: string,
    type: number,
}

export type BtcTurkTickerAllResult = {
    items: BtcTurkTicker[],
    channel: string,
    event: string,
    type: number,
}