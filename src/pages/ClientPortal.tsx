import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
    Loader2, History, Calculator as CalculatorIcon, 
    List, ChevronRight, CheckCircle2,
    Clock, AlertCircle, ShoppingBag, Package
} from 'lucide-react';
import PriceCalculator from '../components/PriceCalculator';
import { clsx } from 'clsx';
import { getStatusColor } from '../lib/statusUtils';

const ClientPortal: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'orders' | 'pricing' | 'calculator' | 'cart'>('orders');
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    // Cart State
    const [cart, setCart] = useState<any[]>([]);
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

    const [selectedProductId, setSelectedProductId] = useState<string>('');

    useEffect(() => {
        const fetchPortalData = async () => {
            if (!clientId) return;
            try {
                const res = await fetch(`/api/portal?clientId=${clientId}`);
                const json = await res.json();
                if (json.error) throw new Error(json.error);
                setData(json);
            } catch (err) {
                console.error('Portal Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchPortalData();
    }, [clientId]);

    const handleAddToCart = (item: any) => {
        setCart([...cart, {
            ...item,
            id: Math.random().toString(36).substr(2, 9)
        }]);
        setActiveTab('cart');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-accent-teal" size={48} />
            </div>
        );
    }

    if (!data?.client) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
                <div className="max-w-md w-full bg-white p-8 border border-gray-100 shadow-xl">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                    <h2 className="text-xl font-bold">Portal Not Found</h2>
                    <p className="text-gray-500 mt-2">Invalid or expired link. Please contact support.</p>
                </div>
            </div>
        );
    }

    const { client, orders, price_list_items } = data;

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <header className="bg-primary text-white py-12 px-4 shadow-lg">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <p className="text-accent-teal font-bold uppercase tracking-widest text-sm mb-1">Kliento Portalas</p>
                        <h1 className="text-3xl md:text-4xl font-bold">{client.company || client.name}</h1>
                        <p className="text-gray-300 mt-2 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-accent-teal" />
                            Sveiki sugrįžę į savo asmeninę erdvę
                        </p>
                    </div>
                    <div className="flex bg-white/10 p-1 rounded-lg backdrop-blur-md">
                        {(['orders', 'pricing', 'calculator', 'cart'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={clsx(
                                    "px-6 py-2 rounded-md text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2",
                                    activeTab === tab ? "bg-white text-primary shadow-lg" : "text-white hover:bg-white/5"
                                )}
                            >
                                {tab === 'orders' && 'Užsakymai'}
                                {tab === 'pricing' && 'Kainynas'}
                                {tab === 'calculator' && 'Skaičiuoklė'}
                                {tab === 'cart' && (
                                    <>
                                        Krepšelis
                                        {cart.length > 0 && (
                                            <span className="bg-accent-teal text-white px-2 py-0.5 rounded-full text-[10px]">
                                                {cart.length}
                                            </span>
                                        )}
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 -mt-6">
                <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden min-h-[600px]">
                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <History className="text-accent-teal" />
                                    Jūsų Užsakymai
                                </h2>
                                <span className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500">
                                    Iš viso: {orders.length}
                                </span>
                            </div>
                            
                            {orders.length === 0 ? (
                                <div className="p-20 text-center text-gray-400">
                                    <ShoppingBag size={64} className="mx-auto mb-4 opacity-10" />
                                    <p className="text-lg">Dar neturite jokių užsakymų.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                                <th className="px-8 py-4">Užsakymo Nr.</th>
                                                <th className="px-8 py-4">Data</th>
                                                <th className="px-8 py-4">Būsena</th>
                                                <th className="px-8 py-4 text-right">Suma</th>
                                                <th className="px-8 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {orders.map((order: any) => {
                                                const isExpanded = expandedOrderId === order.id;
                                                return (
                                                    <React.Fragment key={order.id}>
                                                        <tr 
                                                            onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                                                            className={clsx(
                                                                "hover:bg-gray-50/80 transition-colors group cursor-pointer",
                                                                isExpanded && "bg-gray-50/50"
                                                            )}
                                                        >
                                                            <td className="px-8 py-6">
                                                                <span className="font-bold text-gray-900">{order.order_number}</span>
                                                                <div className="text-xs text-gray-400 mt-1">
                                                                    {order.order_items?.length || 0} pozicijos
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-sm text-gray-600">
                                                                {new Date(order.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className={clsx(
                                                                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                                                    getStatusColor(order.status)
                                                                )}>
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6 text-right font-bold text-primary">
                                                                €{(order.total_price || 0).toFixed(2)}
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <button className={clsx(
                                                                    "text-gray-400 group-hover:text-accent-teal transition-all transform",
                                                                    isExpanded && "rotate-90 text-accent-teal"
                                                                )}>
                                                                    <ChevronRight size={20} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {isExpanded && (
                                                            <tr className="bg-gray-50/30 animate-in fade-in slide-in-from-top-1 duration-200">
                                                                <td colSpan={5} className="px-8 py-6">
                                                                    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                                                                        <table className="w-full text-sm">
                                                                            <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase">
                                                                                <tr>
                                                                                    <th className="px-4 py-2">Gaminys</th>
                                                                                    <th className="px-4 py-2 text-right">Kiekis</th>
                                                                                    <th className="px-4 py-2 text-right">Kaina</th>
                                                                                    <th className="px-4 py-2 text-right">Suma</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-50">
                                                                                {order.order_items?.map((item: any) => (
                                                                                    <tr key={item.id}>
                                                                                        <td className="px-4 py-3">
                                                                                            <span className="font-medium text-gray-800">{item.product_type}</span>
                                                                                            <div className="text-[10px] text-gray-400">
                                                                                                {item.width && item.height ? `${item.width}x${item.height}mm` : ''}
                                                                                                {item.print_type ? `, ${item.print_type}` : ''}
                                                                                            </div>
                                                                                        </td>
                                                                                        <td className="px-4 py-3 text-right text-gray-600">{item.quantity}</td>
                                                                                        <td className="px-4 py-3 text-right text-gray-600">€{item.unit_price}</td>
                                                                                        <td className="px-4 py-3 text-right font-bold text-gray-800">€{item.total_price?.toFixed(2)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pricing Tab */}
                    {activeTab === 'pricing' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 p-8">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-8">
                                <List className="text-accent-teal" />
                                Jūsų Specialios Kainos
                            </h2>
                            
                            {!client.price_list_id ? (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                                    <div className="flex gap-4">
                                        <Clock className="text-blue-500" />
                                        <div>
                                            <p className="font-bold text-blue-900 text-lg">Šiuo metu naudojate standartinį kainyną.</p>
                                            <p className="text-blue-700 mt-1">Specialios kainos bus rodomos čia, kai jos bus priskirtos jūsų paskyrai.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {(price_list_items || []).map((item: any) => (
                                        <div key={item.id} className="border border-gray-100 p-6 rounded-xl hover:shadow-lg transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-accent-teal opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Gaminys</p>
                                            <h3 className="font-bold text-lg text-gray-900 mb-4">{item.products?.name}</h3>
                                            <div className="flex justify-between items-end">
                                                <div className="text-3xl font-black text-accent-teal">
                                                    €{item.custom_base_price.toFixed(2)}
                                                    <span className="text-sm font-medium text-gray-400 ml-1">/vnt</span>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setSelectedProductId(item.product_id);
                                                        setActiveTab('calculator');
                                                    }}
                                                    className="p-2 bg-gray-50 text-gray-400 hover:bg-accent-teal hover:text-white rounded-lg transition-all"
                                                    title="Skaičiuoti"
                                                >
                                                    <CalculatorIcon size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Calculator Tab */}
                    {activeTab === 'calculator' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 p-8 h-full">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-8">
                                <CalculatorIcon className="text-accent-teal" />
                                Kainų skaičiuoklė
                            </h2>

                            <PriceCalculator 
                                clientId={clientId}
                                mode="client"
                                onAction={handleAddToCart}
                                initialProductId={selectedProductId}
                            />
                        </div>
                    )}

                    {/* Cart Tab */}
                    {activeTab === 'cart' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 p-8 h-full flex flex-col">
                            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-8">
                                <ShoppingBag className="text-accent-teal" />
                                Jūsų Krepšelis
                            </h2>

                            {orderSuccess ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-2">Užsakymas Priimtas!</h3>
                                    <p className="text-gray-500 text-lg mb-8">Jūsų užsakymo numeris: <span className="font-bold text-primary">{orderSuccess}</span></p>
                                    <button 
                                        onClick={() => {
                                            setOrderSuccess(null);
                                            setActiveTab('orders');
                                            // Refresh orders
                                            window.location.reload();
                                        }}
                                        className="px-8 py-3 bg-primary text-white font-bold rounded-lg"
                                    >
                                        Grįžti į užsakymus
                                    </button>
                                </div>
                            ) : cart.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 py-20">
                                    <ShoppingBag size={64} className="mb-4 opacity-10" />
                                    <p className="text-lg">Krepšelis tuščias.</p>
                                    <button 
                                        onClick={() => setActiveTab('calculator')}
                                        className="mt-4 text-accent-teal font-bold hover:underline"
                                    >
                                        Eiti į skaičiuoklę
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col lg:flex-row gap-12 flex-1">
                                    <div className="lg:w-2/3 space-y-4">
                                        {cart.map(item => (
                                            <div key={item.id} className="flex items-center justify-between p-6 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex gap-4 items-center">
                                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-accent-teal border border-gray-100">
                                                        <Package size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{item.product_name}</h4>
                                                        <p className="text-xs text-gray-500">
                                                            {item.quantity} vnt. • {item.width}x{item.height}mm
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-8">
                                                    <div className="text-right">
                                                        <div className="font-bold text-primary">€{item.total_price.toFixed(2)}</div>
                                                        <div className="text-[10px] text-gray-400">€{item.unit_price.toFixed(2)}/vnt</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                                                        className="text-red-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <AlertCircle size={20} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="lg:w-1/3 bg-gray-50 p-8 rounded-2xl h-fit border border-gray-100">
                                        <h3 className="text-lg font-bold text-gray-900 mb-6">Suvestinė</h3>
                                        <div className="space-y-4 mb-8">
                                            <div className="flex justify-between text-gray-600">
                                                <span>Suma:</span>
                                                <span>€{cart.reduce((s, i) => s + i.total_price, 0).toFixed(2)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-600">
                                                <span>PVM (21%):</span>
                                                <span>€{(cart.reduce((s, i) => s + i.total_price, 0) * 0.21).toFixed(2)}</span>
                                            </div>
                                            <div className="pt-4 border-t border-gray-200 flex justify-between text-2xl font-black text-primary">
                                                <span>Viso:</span>
                                                <span>€{(cart.reduce((s, i) => s + i.total_price, 0) * 1.21).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <button 
                                            disabled={isSubmittingOrder}
                                            onClick={async () => {
                                                setIsSubmittingOrder(true);
                                                try {
                                                    const res = await fetch('/api/portal', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            clientId,
                                                            items: cart
                                                        })
                                                    });
                                                    const result = await res.json();
                                                    if (result.success) {
                                                        setOrderSuccess(result.order_number);
                                                        setCart([]);
                                                    } else {
                                                        alert('Klaida: ' + result.error);
                                                    }
                                                } catch (err) {
                                                    alert('Nepavyko pateikti užsakymo.');
                                                } finally {
                                                    setIsSubmittingOrder(false);
                                                }
                                            }}
                                            className="w-full py-4 bg-primary text-white font-bold uppercase tracking-widest rounded-xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                        >
                                            {isSubmittingOrder ? (
                                                <><Loader2 className="animate-spin" size={20} /> Teikiamas...</>
                                            ) : (
                                                <><CheckCircle2 size={20} /> Pateikti Užsakymą</>
                                            )}
                                        </button>
                                        <p className="text-[10px] text-gray-400 text-center mt-4 italic">Pateikus užsakymą, mes su jumis susisieksime patvirtinimui.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-6xl mx-auto px-4 mt-12 text-center text-gray-400 text-sm">
                <p>&copy; {new Date().getFullYear()} Keturi Print. Visos teisės saugomos.</p>
            </footer>
        </div>
    );
};

export default ClientPortal;
