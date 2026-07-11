import { useCallback, useEffect, useMemo, useState } from 'react'
import Icon from '@/components/common/Icon'
import httpClient from '@/api/httpClient'
import { adminApi } from '@/api/adminApi'

const number = (value) => Number(value || 0).toLocaleString('vi-VN')

function formatDate(value) {
  if (!value) return 'Chưa có dữ liệu'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu'
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatCard({ label, value, hint, icon, tone }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-950">{value}</p>
          <p className="mt-2 text-xs text-gray-500">{hint}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${tone}`}>
          <Icon name={icon} className="text-[22px] text-white" />
        </div>
      </div>
    </div>
  )
}

export default function AdminScansPage() {
  const [stats, setStats] = useState(null)
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const [scanData, usersPage] = await Promise.all([
        httpClient.get('/scans/admin/stats?limit=100'),
        adminApi.listUsers({ page: 0, size: 1, sort: 'createdAt,desc' }),
      ])
      setStats(scanData)
      setTotalUsers(usersPage.totalElements || 0)
    } catch (err) {
      console.error('Fetch scan stats failed:', err)
      setStats({ totalScans: 0, uniqueScanUsers: 0, scansToday: 0, skinTypeBreakdown: {}, latestScans: [] })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => void fetchStats(), 0)
    return () => clearTimeout(timer)
  }, [fetchStats])

  const filteredScans = useMemo(() => {
    const scans = stats?.latestScans || []
    const keyword = query.trim().toLowerCase()
    if (!keyword) return scans
    return scans.filter((scan) =>
      [scan.userId, scan.skinType, scan.id].some((value) => String(value || '').toLowerCase().includes(keyword)),
    )
  }, [query, stats?.latestScans])

  const skinBreakdown = Object.entries(stats?.skinTypeBreakdown || {})
  const conversionRate = totalUsers ? Math.round((stats?.uniqueScanUsers / totalUsers) * 100) : 0
  const maxBreakdown = Math.max(...skinBreakdown.map(([, count]) => count), 1)

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-secondary">Quản lý quét da</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-950">Lượt quét da</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500">
            Theo dõi số lượt scan, số người dùng đã scan và các bản quét gần đây trong hệ thống.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchStats}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Icon name="refresh" className="text-lg" />
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng lượt quét"
          value={number(stats?.totalScans)}
          hint="Tất cả bản ghi scan đã lưu"
          icon="document_scanner"
          tone="bg-tertiary"
        />
        <StatCard
          label="Người dùng đã quét"
          value={number(stats?.uniqueScanUsers)}
          hint="Đếm theo userId duy nhất"
          icon="group"
          tone="bg-secondary"
        />
        <StatCard
          label="Lượt quét hôm nay"
          value={number(stats?.scansToday)}
          hint="Tính từ 00:00 hôm nay"
          icon="today"
          tone="bg-primary"
        />
        <StatCard
          label="Tỷ lệ scan / lượt"
          value={`${conversionRate}%`}
          hint={`${number(stats?.uniqueScanUsers)} / ${number(totalUsers)} người dùng`}
          icon="analytics"
          tone="bg-gray-950"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-base font-semibold text-gray-950">Phân bổ loại da</h2>
          </div>
          <div className="space-y-4 p-5">
            {skinBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Chưa có dữ liệu phân bổ</p>
            ) : (
              skinBreakdown.map(([skinType, count]) => (
                <div key={skinType}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-gray-700">{skinType}</span>
                    <span className="font-semibold text-gray-950">{number(count)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-secondary"
                      style={{ width: `${Math.max(8, (count / maxBreakdown) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-semibold text-gray-950">Danh sách scan gần đây</h2>
            <div className="relative w-full md:w-72">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm userId, loại da..."
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Mã scan</th>
                  <th className="px-5 py-3">Người dùng</th>
                  <th className="px-5 py-3">Loại da</th>
                  <th className="px-5 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredScans.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-5 py-10 text-center text-gray-400">
                      Không tìm thấy lượt quét nào
                    </td>
                  </tr>
                ) : (
                  filteredScans.map((scan) => (
                    <tr key={scan.id} className="hover:bg-gray-50">
                      <td className="max-w-48 truncate px-5 py-4 font-semibold text-primary">{scan.id}</td>
                      <td className="max-w-48 truncate px-5 py-4 text-gray-700">{scan.userId}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-secondary-container px-2.5 py-1 text-xs font-semibold text-secondary">
                          {scan.skinType || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{formatDate(scan.analyzedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
