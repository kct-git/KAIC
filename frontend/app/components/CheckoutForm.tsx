import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Truck, User, Phone, MapPin, Calendar, Gift, ChevronRight } from 'lucide-react';

interface CheckoutFormProps {
  onSendMessage?: (text: string) => void;
}

export default function CheckoutForm({ onSendMessage }: CheckoutFormProps) {
  const [formData, setFormData] = useState({
    recipient_name: '',
    delivery_phone_number: '',
    delivery_address: '',
    delivery_city: '',
    delivery_date: '',
    sender_name: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSendMessage) return;
    
    setIsSubmitting(true);
    
    // Create the command payload exactly as the Logistics agent expects
    const payload = {
      recipient_name: formData.recipient_name,
      phone: formData.delivery_phone_number,
      address: formData.delivery_address,
      city: formData.delivery_city,
      delivery_date: formData.delivery_date,
      sender_name: formData.sender_name
    };

    onSendMessage(`SYSTEM_COMMAND: Submit Checkout ${JSON.stringify(payload)}`);
  };

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-[#e0dcd3]/50">
      <div className="bg-[#402970] p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Truck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-bold tracking-tight">Delivery Details</h2>
        </div>
        <p className="text-[#d1ccbf] text-sm">Please provide the details below to complete your order.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2 border-b border-[#e0dcd3]/50 pb-2">
            <User className="w-4 h-4 text-emerald-600" /> Recipient
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Recipient Name</label>
              <input required type="text" name="recipient_name" value={formData.recipient_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#faf9f6] border border-[#d1ccbf]/80 rounded-xl focus:outline-none focus:border-[#402970]/40 focus:ring-1 focus:ring-[#402970]/20 transition-all text-stone-800" placeholder="John Doe" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Phone Number</label>
              <input required type="tel" name="delivery_phone_number" value={formData.delivery_phone_number} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#faf9f6] border border-[#d1ccbf]/80 rounded-xl focus:outline-none focus:border-[#402970]/40 focus:ring-1 focus:ring-[#402970]/20 transition-all text-stone-800" placeholder="+94 77 123 4567" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2 border-b border-[#e0dcd3]/50 pb-2">
            <MapPin className="w-4 h-4 text-emerald-600" /> Destination
          </h3>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Delivery Address</label>
            <input required type="text" name="delivery_address" value={formData.delivery_address} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#faf9f6] border border-[#d1ccbf]/80 rounded-xl focus:outline-none focus:border-[#402970]/40 focus:ring-1 focus:ring-[#402970]/20 transition-all text-stone-800" placeholder="123 Main Street, Colombo 03" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">City</label>
              <input required type="text" name="delivery_city" value={formData.delivery_city} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#faf9f6] border border-[#d1ccbf]/80 rounded-xl focus:outline-none focus:border-[#402970]/40 focus:ring-1 focus:ring-[#402970]/20 transition-all text-stone-800" placeholder="Colombo" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Delivery Date</label>
              <div className="relative">
                <input required type="date" min={new Date().toISOString().split('T')[0]} name="delivery_date" value={formData.delivery_date} onChange={handleChange} className="w-full pl-10 pr-4 py-2.5 bg-[#faf9f6] border border-[#d1ccbf]/80 rounded-xl focus:outline-none focus:border-[#402970]/40 focus:ring-1 focus:ring-[#402970]/20 transition-all text-stone-800" />
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider flex items-center gap-2 border-b border-[#e0dcd3]/50 pb-2">
            <Gift className="w-4 h-4 text-emerald-600" /> Sender
          </h3>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1">Your Name</label>
            <input required type="text" name="sender_name" value={formData.sender_name} onChange={handleChange} className="w-full px-4 py-2.5 bg-[#faf9f6] border border-[#d1ccbf]/80 rounded-xl focus:outline-none focus:border-[#402970]/40 focus:ring-1 focus:ring-[#402970]/20 transition-all text-stone-800" placeholder="Jane Doe" />
          </div>
        </div>

        <div className="pt-4">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            disabled={isSubmitting}
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#402970] hover:bg-[#2d1b54] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#402970]/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Submit Order'}
            {!isSubmitting && <ChevronRight className="w-5 h-5" />}
          </motion.button>
        </div>
        
      </form>
    </div>
  );
}
