import axios from 'axios';
import * as crypto from 'crypto';
import CryptoJS from 'crypto-js';
import * as jwt from 'jsonwebtoken';
import { WebSocket } from 'ws';
import {
  getCoinbaseSymbol,
  sideMap
} from './coinbase-spot';
import { Logger } from '../../util/logging';
import { getSklSymbol } from '../../util/config';
import {
  BalanceRequest,
  BalanceResponse,
  BatchOrdersRequest,
  CancelOrdersRequest,
  ConnectorConfiguration,
  ConnectorGroup,
  Credential,
  OpenOrdersRequest,
  OrderState,
  OrderStatusUpdate,
  PrivateExchangeConnector,
  Serializable,
  Side,
  SklEvent,
} from '../../types';
const logger = Logger.getInstance('coinbase-spot-private-connector')