import axios from 'axios'
import { URLSearchParams } from 'url'
import { BTCTURK_REST_URL, getRestAuthHeaders } from './utils'

export interface IBtcTurkRestClient {
    apiBaseUrl: string
    publicKey?: string
    delete: (
        path: string,
        urlParams?: any | URLSearchParams
    ) => Promise<any>
    get: (
        path: string,
        urlParams?: any | URLSearchParams
    ) => Promise<any>
    post: (
        path: string,
        data?: object,
        urlParams?: any | URLSearchParams
    ) => Promise<any>

}

export class BtcTurkRestClient implements IBtcTurkRestClient {
    constructor(
        public apiBaseUrl: string = BTCTURK_REST_URL,
        public publicKey?: string,
        private privateKey?: string,
    ) { }

    public delete = async (
        path: string,
        urlParams?: any | URLSearchParams,
    ): Promise<any> => {
        if (!path.startsWith('/')) path = `/${path}`

        const paramsStr = new URLSearchParams(urlParams || {}).toString()
        const url = `${this.apiBaseUrl}${path}?${paramsStr}`
        const headers = !this.privateKey || !this.publicKey
            ? {}
            : getRestAuthHeaders(this.publicKey, this.privateKey)
        const options = { headers: headers }
        const result = await axios
            .delete(url, options)
            .then(getResultData)
            .catch(rejectWithError)

        return result
    }

    public get = async (
        path: string,
        urlParams?: any | URLSearchParams,
    ): Promise<any> => {
        if (!path.startsWith('/')) path = `/${path}`

        const paramsStr = new URLSearchParams(urlParams || {}).toString()
        const url = `${this.apiBaseUrl}${path}?${paramsStr}`
        const headers = !this.privateKey || !this.publicKey
            ? {}
            : getRestAuthHeaders(this.publicKey, this.privateKey)
        const options = { headers: headers }
        const result = await axios
            .get(url, options)
            .then(getResultData)
            .catch(rejectWithError)

        return result
    }

    public post = async (
        path: string,
        data: object = {},
        urlParams?: any | URLSearchParams,
    ): Promise<any> => {
        if (!path.startsWith('/')) path = `/${path}/`

        const paramsStr = new URLSearchParams(urlParams || {}).toString()
        const url = `${this.apiBaseUrl}${path}?${paramsStr}`
        const headers = !this.privateKey || !this.publicKey
            ? {}
            : getRestAuthHeaders(this.publicKey, this.privateKey)
        const options = { headers }
        const result = await axios
            .post(
                url,
                JSON.stringify(data),
                options
            )
            .then(getResultData, rejectWithError)

        return result
    }
}
export default BtcTurkRestClient

const getResultData = (result: any) => result?.data

const rejectWithError = (err: any): Promise<Error> => {
    const data = err?.response?.data || err?.data || {}
    console.log(data)
    err = new Error(data.message)
    err.code = data.code
    return Promise.reject(err)
}