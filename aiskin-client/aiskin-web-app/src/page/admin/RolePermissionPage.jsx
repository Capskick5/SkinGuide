import { useState, useEffect } from 'react';
import { App as AntApp } from 'antd';
import { roleApi } from '@/api/roleApi';
import { permissionApi } from '@/api/permissionApi';
import { systemApi } from '@/api/systemApi';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = startPage + maxPagesToShow - 1;

        if (endPage > totalPages) {
            endPage = totalPages;
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        currentPage === i 
                            ? 'bg-indigo-600 text-white border border-indigo-600' 
                            : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className="flex items-center justify-center space-x-2 mt-3 mb-3">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 text-sm font-medium bg-white"
            >
                &lt;
            </button>
            
            {currentPage > 3 && totalPages > 5 && (
                <>
                    <button onClick={() => onPageChange(1)} className="px-3 py-1 rounded bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 text-sm font-medium">1</button>
                    <span className="text-gray-500">...</span>
                </>
            )}

            {renderPageNumbers()}

            {currentPage < totalPages - 2 && totalPages > 5 && (
                <>
                    <span className="text-gray-500">...</span>
                    <button onClick={() => onPageChange(totalPages)} className="px-3 py-1 rounded bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 text-sm font-medium">{totalPages}</button>
                </>
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-50 text-sm font-medium bg-white"
            >
                &gt;
            </button>
        </div>
    );
};

export default function RolePermissionPage() {
    const { message } = AntApp.useApp();
    const [activeTab, setActiveTab] = useState('roles');
    
    // Data
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Roles Tab State
    const [selectedRole, setSelectedRole] = useState(null);
    const [rolePermissions, setRolePermissions] = useState(new Set());
    const [newRoleName, setNewRoleName] = useState('');
    const [newRoleDesc, setNewRoleDesc] = useState('');
    
    // Permissions Tab State
    const [syncing, setSyncing] = useState(false);
    const [newPerm, setNewPerm] = useState({ name: '', resource: '', method: 'GET', service: '', description: '' });

    // Search and Pagination State
    const [searchPath, setSearchPath] = useState('');
    const [rolePage, setRolePage] = useState(1);
    const [permPage, setPermPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    useEffect(() => {
        loadData();
    }, []);

    // Reset pagination when search or selected role changes
    useEffect(() => {
        setRolePage(1);
        setPermPage(1);
    }, [searchPath, selectedRole]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                roleApi.getAllRoles(),
                permissionApi.getAllPermissions()
            ]);
            setRoles(rolesData || []);
            setPermissions(permsData || []);
            
            if (selectedRole) {
                const updatedRole = rolesData.find(r => r.id === selectedRole.id);
                if (updatedRole) {
                    setSelectedRole(updatedRole);
                    setRolePermissions(new Set(updatedRole.permissions || []));
                }
            }
        } catch (error) {
            console.error('Failed to load data', error);
            message.error('Lỗi khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    // === HANDLERS FOR ROLES ===
    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRoleName) return;
        try {
            await roleApi.createRole({ name: newRoleName, description: newRoleDesc });
            setNewRoleName('');
            setNewRoleDesc('');
            loadData();
        } catch (error) {
            message.error('Lỗi tạo role: ' + (error.message || ''));
        }
    };

    const handleSelectRole = (role) => {
        setSelectedRole(role);
        setRolePermissions(new Set(role.permissions || []));
    };

    const togglePermissionForRole = (permId) => {
        const next = new Set(rolePermissions);
        if (next.has(permId)) {
            next.delete(permId);
        } else {
            next.add(permId);
        }
        setRolePermissions(next);
    };

    const handleSaveRolePermissions = async () => {
        if (!selectedRole) return;
        try {
            await roleApi.assignPermissions(selectedRole.id, Array.from(rolePermissions));
            message.success('Cập nhật quyền thành công!');
            loadData();
        } catch (error) {
            message.error('Lỗi cập nhật quyền');
        }
    };

    // === HANDLERS FOR PERMISSIONS ===
    const handleSyncEndpoints = async () => {
        setSyncing(true);
        try {
            const [userEps, productEps, scanEps] = await Promise.all([
                systemApi.getUserServiceEndpoints().catch(() => []),
                systemApi.getProductServiceEndpoints().catch(() => []),
                systemApi.getAiScanServiceEndpoints().catch(() => [])
            ]);

            if (userEps.length > 0) await permissionApi.syncEndpoints({ service: 'user-service', endpoints: userEps });
            if (productEps.length > 0) await permissionApi.syncEndpoints({ service: 'product-service', endpoints: productEps });
            if (scanEps.length > 0) await permissionApi.syncEndpoints({ service: 'ai-scan-service', endpoints: scanEps });

            message.success('Đồng bộ API thành công!');
            loadData();
        } catch (error) {
            console.error('Sync failed', error);
            message.error('Lỗi khi đồng bộ API');
        } finally {
            setSyncing(false);
        }
    };

    const handleCreatePermission = async (e) => {
        e.preventDefault();
        if (!newPerm.name || !newPerm.resource || !newPerm.method) {
            message.warning('Vui lòng điền đủ các trường bắt buộc');
            return;
        }
        try {
            await permissionApi.createPermission(newPerm);
            message.success('Thêm permission thành công');
            setNewPerm({ name: '', resource: '', method: 'GET', service: '', description: '' });
            loadData();
        } catch (error) {
            message.error('Lỗi thêm permission: ' + (error.message || ''));
        }
    };

    // Filter, Sort and Paginate Logic
    const filteredRolePerms = permissions.filter(p => p.resource.toLowerCase().includes(searchPath.toLowerCase()) || p.name.toLowerCase().includes(searchPath.toLowerCase()));
    if (selectedRole) {
        filteredRolePerms.sort((a, b) => {
            const hasA = rolePermissions.has(a.id);
            const hasB = rolePermissions.has(b.id);
            if (hasA && !hasB) return -1;
            if (!hasA && hasB) return 1;
            return a.resource.localeCompare(b.resource);
        });
    } else {
        filteredRolePerms.sort((a, b) => a.resource.localeCompare(b.resource));
    }
    const totalRolePages = Math.ceil(filteredRolePerms.length / ITEMS_PER_PAGE);
    const paginatedRolePerms = filteredRolePerms.slice((rolePage - 1) * ITEMS_PER_PAGE, rolePage * ITEMS_PER_PAGE);

    const filteredPerms = permissions.filter(p => p.resource.toLowerCase().includes(searchPath.toLowerCase()) || p.name.toLowerCase().includes(searchPath.toLowerCase()));
    filteredPerms.sort((a, b) => a.resource.localeCompare(b.resource));
    const totalPermPages = Math.ceil(filteredPerms.length / ITEMS_PER_PAGE);
    const paginatedPerms = filteredPerms.slice((permPage - 1) * ITEMS_PER_PAGE, permPage * ITEMS_PER_PAGE);

    return (
        <div className="p-2 sm:p-6 max-w-7xl mx-auto flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Quản trị Truy Cập</h1>
            </div>

            {/* TABS */}
            <div className="flex space-x-6 border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('roles')}
                    className={`pb-3 font-medium transition-colors ${activeTab === 'roles' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Gán Quyền (Roles)
                </button>
                <button 
                    onClick={() => setActiveTab('permissions')}
                    className={`pb-3 font-medium transition-colors ${activeTab === 'permissions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
                >
                    Thuộc tính & Quyền (Permissions)
                </button>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center text-gray-500">Đang tải dữ liệu...</div>
            ) : (
                <div className="flex flex-col gap-6">
                    {/* SEARCH BAR */}
                    <div className="flex items-center gap-2 max-w-md">
                        <input 
                            type="text" 
                            placeholder="🔍 Tìm kiếm theo Resource Path hoặc Tên quyền..." 
                            className="w-full border border-gray-300 p-2 text-sm rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                            value={searchPath}
                            onChange={e => setSearchPath(e.target.value)}
                        />
                    </div>

                    {/* TAB ROLES */}
                    {activeTab === 'roles' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                            <div className="lg:col-span-1 flex flex-col gap-6">
                                <div className="bg-white p-5 rounded border border-gray-200 shadow-sm">
                                    <h2 className="font-semibold text-gray-900 mb-4">Tạo Role mới</h2>
                                    <form onSubmit={handleCreateRole} className="space-y-3">
                                        <input 
                                            type="text" 
                                            placeholder="Tên Role (vd: MANAGER)" 
                                            className="w-full border border-gray-300 p-2 text-sm rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            value={newRoleName}
                                            onChange={e => setNewRoleName(e.target.value)}
                                            required
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Mô tả" 
                                            className="w-full border border-gray-300 p-2 text-sm rounded outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                            value={newRoleDesc}
                                            onChange={e => setNewRoleDesc(e.target.value)}
                                        />
                                        <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded text-sm hover:bg-indigo-700 font-medium transition-colors">
                                            Thêm Role
                                        </button>
                                    </form>
                                </div>

                                <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                        <h2 className="font-semibold text-gray-900">Danh sách Roles</h2>
                                    </div>
                                    <ul className="divide-y divide-gray-100">
                                        {roles.map(role => (
                                            <li 
                                                key={role.id}
                                                onClick={() => handleSelectRole(role)}
                                                className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${selectedRole?.id === role.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'border-l-4 border-transparent'}`}
                                            >
                                                <div className={`font-semibold ${selectedRole?.id === role.id ? 'text-indigo-900' : 'text-gray-900'}`}>{role.name}</div>
                                                <div className="text-sm text-gray-500 mt-1">{role.description}</div>
                                                <div className="text-xs font-medium text-gray-500 mt-2">{role.permissions?.length || 0} quyền</div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="lg:col-span-3 bg-white rounded border border-gray-200 shadow-sm flex flex-col h-[750px]">
                                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                                    <h2 className="font-semibold text-gray-900">
                                        {selectedRole ? `Phân quyền cho: ${selectedRole.name}` : 'Chọn Role để phân quyền'}
                                    </h2>
                                    {selectedRole && selectedRole.name !== 'ADMIN' && (
                                        <button 
                                            onClick={handleSaveRolePermissions}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm rounded font-medium transition-colors shadow-sm"
                                        >
                                            Lưu quyền
                                        </button>
                                    )}
                                    {selectedRole?.name === 'ADMIN' && (
                                        <span className="text-sm text-red-500 font-medium bg-red-50 px-3 py-1 rounded">Quyền mặc định tối cao (Không thể sửa)</span>
                                    )}
                                </div>
                                <div className="overflow-y-auto flex-1 p-0 relative">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-3 text-sm font-semibold text-gray-700 w-16 text-center">Cấp</th>
                                                <th className="p-3 text-sm font-semibold text-gray-700">Thuộc tính / Tên</th>
                                                <th className="p-3 text-sm font-semibold text-gray-700 w-24">Method</th>
                                                <th className="p-3 text-sm font-semibold text-gray-700">Resource (Path)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedRolePerms.map(p => {
                                                const isChecked = rolePermissions.has(p.id);
                                                return (
                                                    <tr key={p.id} className={`transition-colors ${isChecked ? 'bg-indigo-50/40 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                                        <td className="p-3 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-200"
                                                                checked={selectedRole?.name === 'ADMIN' ? true : isChecked}
                                                                onChange={() => selectedRole && togglePermissionForRole(p.id)}
                                                                disabled={!selectedRole || selectedRole.name === 'ADMIN'}
                                                            />
                                                        </td>
                                                        <td className="p-3 text-sm text-gray-900 font-medium">{p.name}</td>
                                                        <td className="p-3">
                                                            <span className="px-2 py-1 text-[11px] bg-gray-100 text-gray-700 rounded font-bold">{p.method}</span>
                                                        </td>
                                                        <td className="p-3 text-sm font-mono text-gray-500 break-all">{p.resource}</td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredRolePerms.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-10 text-gray-500 text-sm">Không tìm thấy quyền nào.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-gray-200 bg-gray-50 shrink-0">
                                    <Pagination currentPage={rolePage} totalPages={totalRolePages} onPageChange={setRolePage} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB PERMISSIONS */}
                    {activeTab === 'permissions' && (
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                            <div className="lg:col-span-1 flex flex-col gap-6">
                                <div className="bg-white p-5 rounded border border-gray-200 shadow-sm">
                                    <h2 className="font-semibold text-gray-900 mb-4">Thêm Quyền Thủ Công</h2>
                                    <form onSubmit={handleCreatePermission} className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Tên Quyền</label>
                                            <input type="text" required placeholder="Ví dụ: Tạo bài viết" className="w-full border border-gray-300 p-2 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={newPerm.name} onChange={e => setNewPerm({...newPerm, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Resource Path</label>
                                            <input type="text" required placeholder="/api/posts/**" className="w-full border border-gray-300 p-2 rounded text-sm font-mono outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={newPerm.resource} onChange={e => setNewPerm({...newPerm, resource: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">HTTP Method</label>
                                            <select className="w-full border border-gray-300 p-2 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={newPerm.method} onChange={e => setNewPerm({...newPerm, method: e.target.value})}>
                                                <option>GET</option>
                                                <option>POST</option>
                                                <option>PUT</option>
                                                <option>DELETE</option>
                                                <option>PATCH</option>
                                                <option>ANY</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Service Group</label>
                                            <input type="text" placeholder="user-service" className="w-full border border-gray-300 p-2 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={newPerm.service} onChange={e => setNewPerm({...newPerm, service: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
                                            <textarea rows="2" placeholder="..." className="w-full border border-gray-300 p-2 rounded text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" value={newPerm.description} onChange={e => setNewPerm({...newPerm, description: e.target.value})} />
                                        </div>
                                        <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded text-sm hover:bg-indigo-700 font-medium transition-colors">Lưu Quyền</button>
                                    </form>
                                </div>

                                <div className="bg-blue-50 p-5 rounded border border-blue-100 shadow-sm">
                                    <h3 className="font-semibold text-blue-900 mb-2">Đồng bộ tự động</h3>
                                    <p className="text-sm text-blue-800 mb-4">Tự động quét API từ các Microservices để xây dựng danh sách quyền chính xác nhất.</p>
                                    <button 
                                        onClick={handleSyncEndpoints} 
                                        disabled={syncing}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {syncing ? 'Đang đồng bộ...' : '🔄 Bắt đầu quét APIs'}
                                    </button>
                                </div>
                            </div>

                            <div className="lg:col-span-3 bg-white rounded border border-gray-200 shadow-sm flex flex-col h-[750px]">
                                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
                                    <h2 className="font-semibold text-gray-900">Kho Thuộc tính / Quyền ({filteredPerms.length})</h2>
                                </div>
                                <div className="overflow-y-auto flex-1 p-0 relative">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                                            <tr>
                                                <th className="p-3 text-sm font-semibold text-gray-700">Tên</th>
                                                <th className="p-3 text-sm font-semibold text-gray-700">Method</th>
                                                <th className="p-3 text-sm font-semibold text-gray-700">Resource Path</th>
                                                <th className="p-3 text-sm font-semibold text-gray-700">Service</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {paginatedPerms.map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-3 text-sm text-gray-900 font-medium">
                                                        {p.name}
                                                        {p.description && <div className="text-xs text-gray-500 font-normal mt-1">{p.description}</div>}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className="px-2 py-1 text-[11px] bg-gray-100 text-gray-700 rounded font-bold">{p.method}</span>
                                                    </td>
                                                    <td className="p-3 text-sm font-mono text-gray-500 break-all">{p.resource}</td>
                                                    <td className="p-3 text-xs text-gray-400 font-medium">{p.service}</td>
                                                </tr>
                                            ))}
                                            {filteredPerms.length === 0 && (
                                                <tr><td colSpan="4" className="text-center py-10 text-gray-500 text-sm">Không tìm thấy quyền nào.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-gray-200 bg-gray-50 shrink-0">
                                    <Pagination currentPage={permPage} totalPages={totalPermPages} onPageChange={setPermPage} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
