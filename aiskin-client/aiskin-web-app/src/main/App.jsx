import '@ant-design/v5-patch-for-react-19'
import { ConfigProvider, App as AntApp } from 'antd'
import AppRoutes from '@/route/AppRoutes'
import { AuthProvider } from '@/hook/AuthContext'

/**
 * Root component.
 * - ConfigProvider: cấu hình theme AntD đồng bộ với design system (tông hồng).
 * - AppRoutes: toàn bộ định tuyến.
 */
const antdTheme = {
  token: {
    colorPrimary: '#6750e4',
    colorLink: '#6750e4',
    fontFamily: "'Inter', system-ui, sans-serif",
    borderRadius: 12,
    colorBorder: '#e4e0f3',
  },
  components: {
    Input: { controlHeight: 44, borderRadius: 12 },
    Button: { controlHeight: 44 },
  },
}

export default function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <AntApp>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  )
}
