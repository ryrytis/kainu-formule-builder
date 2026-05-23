import React, { useState } from 'react';
import { Calculator as CalculatorIcon } from 'lucide-react';
import CreateOrderModal from '../components/CreateOrderModal';
import ClientSelect from '../components/ClientSelect';
import PriceCalculator from '../components/PriceCalculator';
import { useAuth } from '../contexts/AuthContext';

const Calculator: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [clientId, setClientId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    const handleAction = (data: any) => {
        setSelectedItem(data);
        setIsCreateModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
                        <CalculatorIcon className="text-accent-teal" />
                        Kainų skaičiuoklė
                    </h1>
                    <p className="text-gray-500 mt-1">Konfigūruokite gaminį ir gaukite tikslią sąmatą realiu laiku.</p>
                </div>
                {isAdmin && (
                    <div className="w-64">
                        <ClientSelect 
                            value={clientId} 
                            onChange={setClientId} 
                            className="!mb-0" 
                        />
                    </div>
                )}
            </div>

            <PriceCalculator 
                clientId={clientId}
                mode="admin"
                onAction={handleAction}
            />

            <CreateOrderModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onOrderCreated={() => { }}
                initialItem={selectedItem ? {
                    product_id: selectedItem.product_id,
                    product_type: selectedItem.product_name,
                    product_category: selectedItem.product_category,
                    material_id: selectedItem.material_id,
                    width: parseFloat(selectedItem.width) || 0,
                    height: parseFloat(selectedItem.height) || 0,
                    length: parseFloat(selectedItem.length) || 0,
                    quantity: selectedItem.quantity,
                    unit_price: selectedItem.unit_price,
                    total_price: selectedItem.total_price,
                    print_type: selectedItem.print_type,
                    paper_type: selectedItem.paper_type,
                    pages: selectedItem.pages
                } : undefined}
            />
        </div>
    );
};

export default Calculator;
