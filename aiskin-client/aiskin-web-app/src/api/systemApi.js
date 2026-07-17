import httpClient from './httpClient';

export const systemApi = {
    getUserServiceEndpoints: () => httpClient.get('/users/system/endpoints'),
    getProductServiceEndpoints: () => httpClient.get('/products/system/endpoints'),
    getAiScanServiceEndpoints: () => httpClient.get('/scans/system/endpoints'),
    getOrderServiceEndpoints: () => httpClient.get('/orders/system/endpoints')
};
