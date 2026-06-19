import httpClient from './httpClient';

export const roleApi = {
    getAllRoles: () => httpClient.get('/admin/roles'),
    createRole: (data) => httpClient.post('/admin/roles', data),
    assignPermissions: (roleId, permissionIds) => httpClient.post(`/admin/roles/${roleId}/permissions`, permissionIds)
};
