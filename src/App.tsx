import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import SidebarLayout from './layouts/SidebarLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
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

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/onboarding/:clientId" element={<ClientOnboarding />} />

                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<SidebarLayout />}>
                            <Route index element={<Dashboard />} />
                            <Route path="tasks" element={<Tasks />} />
                            <Route path="orders" element={<Orders />} />
                            <Route path="orders/:id" element={<OrderDetails />} />
                            <Route path="clients" element={<Clients />} />
                            <Route path="materials" element={<Materials />} />
                            <Route path="products" element={<Products />} />
                            <Route path="products/:id/pricing" element={<ProductPricingMatrix />} />
                            <Route path="reporting" element={<Reporting />} />
                            <Route path="rules" element={<CalculationRules />} />
                            <Route path="calculator" element={<Calculator />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
