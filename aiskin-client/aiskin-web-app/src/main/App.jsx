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
    colorPrimary: '#ff6f61',
    colorLink: '#1f7a68',
    fontFamily: "'Inter', system-ui, sans-serif",
    borderRadius: 8,
    colorBorder: '#eadbd5',
    colorBgLayout: '#fbfaf7',
    colorText: '#172026',
  },
  components: {
    Input: { controlHeight: 44, borderRadius: 8 },
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
