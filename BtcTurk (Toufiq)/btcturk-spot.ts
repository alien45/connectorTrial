import {
    ConnectorConfiguration,
    ConnectorGroup,
    Side,
} from '../../types';

export const CONNECTOR_TYPE = 'BtcTurk'

export const getBtcTurkSymbol = (symbolGroup: ConnectorGroup, connectorConfig: ConnectorConfiguration): string => {
    return `${symbolGroup.name}-${connectorConfig.quoteAsset}`
}