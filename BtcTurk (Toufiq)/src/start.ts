import BtcTurkSpotPrivateConnector from './connetors/private/btcturk-spot-private-connector'
import BtcTurkSpotPublicConnector from './connetors/public/btcturk-spot-public-connector'

const publicKey = process.env.BTCTURK_PUBLIC_KEY || ''
const privateKey = process.env.BTCTURK_PRIVATE_KEY || ''

const publicConnector = new BtcTurkSpotPublicConnector(
    { name: 'BTC' },
    { quoteAsset: 'TRY' },
)
publicConnector.debug = false
publicConnector.connect(data => console.log('BtcTurk Public: message received =>', data))

// const privateConnector = new BtcTurkSpotPrivateConnector(
//     { name: 'BTC' },
//     { quoteAsset: 'USDT' },
//     { key: publicKey, secret: privateKey })

// privateConnector.debug = false
// privateConnector.connect(data => console.log('BtcTurk Private: message received =>', data))