import httpClient from './httpClient';

export const permissionApi = {
    getAllPermissions: () => httpClient.get('/admin/permissions'),
    createPermission: (data) => httpClient.post('/admin/permissions', data),
    syncEndpoints: (data) => httpClient.post('/admin/permissions/sync', data)
};
