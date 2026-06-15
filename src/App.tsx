import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SidebarLayout from './layouts/SidebarLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PendingApproval from './pages/PendingApproval';
import UserManagement from './pages/UserManagement';
import Tasks from './pages/Tasks';
import Orders from './pages/Orders';
import OrderDetails from './pages/OrderDetails';
import Clients from './pages/Clients';
import Materials from './pages/Materials';
import Products from './pages/Products';
import CalculationRules from './pages/CalculationRules';
import Settings from './pages/Settings';
import Reporting from './pages/Reporting';
import ProductPricingMatrix from './pages/ProductPricingMatrix';
import Calculator from './pages/Calculator';
import ClientOnboarding from './pages/ClientOnboarding';
import Works from './pages/Works';
import AiSettings from './pages/AiSettings';
import AiUsage from './pages/AiUsage';
import MetalografijaOrder from './pages/MetalografijaOrder';
import PriceLists from './pages/PriceLists';
import ClientPortal from './pages/ClientPortal';
import { MonthlyReportPage } from './pages/MonthlyReportPage';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/pending" element={<PendingApproval />} />
                    <Route path="/onboarding/:clientId" element={<ClientOnboarding />} />
                    <Route path="/portal/:clientId" element={<ClientPortal />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<SidebarLayout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="calculator" element={<Calculator />} />
                            
                            {/* Admin only routes */}
                            <Route element={<AdminRoute />}>
                                <Route path="tasks" element={<Tasks />} />
                                <Route path="orders/:id" element={<OrderDetails />} />
                                <Route path="monthly-report" element={<MonthlyReportPage />} />
                                <Route path="clients" element={<Clients />} />
                                <Route path="materials" element={<Materials />} />
                                <Route path="products" element={<Products />} />
                                <Route path="price-lists" element={<PriceLists />} />
                                <Route path="products/:id/pricing" element={<ProductPricingMatrix />} />
                                <Route path="works" element={<Works />} />
                                <Route path="reporting" element={<Reporting />} />
                                <Route path="rules" element={<CalculationRules />} />
                                <Route path="settings" element={<Settings />} />
                                <Route path="users" element={<UserManagement />} />
                                <Route path="ai-settings" element={<AiSettings />} />
                                <Route path="ai-usage" element={<AiUsage />} />
                                <Route path="metalografija" element={<MetalografijaOrder />} />
                            </Route>
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
