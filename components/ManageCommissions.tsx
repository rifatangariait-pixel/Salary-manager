import React, { useState } from 'react';
import { CommissionStructure } from '../types';
import { Percent, Plus, Trash2, Save, AlertTriangle, ArrowRight } from 'lucide-react';

interface ManageCommissionsProps {
  rates: Record<string, CommissionStructure>;
  onUpdateRates: (newRates: Record<string, CommissionStructure>) => void;
}

const ManageCommissions: React.FC<ManageCommissionsProps> = ({ rates, onUpdateRates }) => {
  const [localRates, setLocalRates] = useState<Record<string, CommissionStructure>>({ ...rates });
  const [newType, setNewType] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  const handleRateChange = (type: string, field: 'own' | 'office', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setLocalRates(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: numValue
      }
    }));
    setIsDirty(true);
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    const typeName = newType.trim().toUpperCase();
    if (!typeName) return;
    if (localRates[typeName]) {
      alert('This commission type already exists.');
      return;
    }

    setLocalRates(prev => ({
      ...prev,
      [typeName]: { typeCode: typeName, own: 0, office: 0 }
    }));
    setNewType('');
    setIsDirty(true);
  };

  const handleDeleteType = (type: string) => {
    if (confirm(`Are you sure you want to delete Type ${type}? This may affect employees assigned to this type.`)) {
      const updated = { ...localRates };
      delete updated[type];
      setLocalRates(updated);
      setIsDirty(true);
    }
  };

  const handleSave = () => {
    onUpdateRates(localRates);
    setIsDirty(false);
    alert('Commission rates updated successfully!');
  };

  return (
    <div className="max-w-4xl mx-auto h-full flex flex-col">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-fuchsia-100 p-2 rounded-lg text-fuchsia-600">
              <Percent size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Commission Setup</h2>
              <p className="text-sm text-slate-500">Manage collection percentages for Own vs. Office somity</p>
            </div>
          </div>
          
          <button 
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center space-x-2 bg-fuchsia-600 text-white px-4 py-2 rounded-lg hover:bg-fuchsia-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
          >
            <Save size={16} />
            <span>Save Changes</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Add New Card */}
            <div className="lg:col-span-1">
               <div className="bg-fuchsia-50 border border-fuchsia-100 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-fuchsia-900 uppercase tracking-wide mb-3">Add New Type</h3>
                  <form onSubmit={handleAddType} className="space-y-4">
                     <div>
                        <label className="text-xs font-semibold text-slate-600 mb-1 block">Type Code (e.g. D, SPECIAL)</label>
                        <input 
                          type="text" 
                          value={newType} 
                          onChange={(e) => setNewType(e.target.value)}
                          className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-fuchsia-500 outline-none uppercase font-bold"
                          placeholder="TYPE CODE"
                        />
                     </div>
                     <button type="submit" className="w-full bg-white border border-fuchsia-200 text-fuchsia-700 py-2 rounded-lg text-sm font-medium hover:bg-white/50 flex items-center justify-center gap-2">
                        <Plus size={16} /> Add Type
                     </button>
                  </form>
               </div>

               <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 flex gap-2 items-start">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  <p>Changes made here will affect new salary calculations immediately. Existing calculated sheets might remain unchanged until re-generated or updated.</p>
               </div>
            </div>

            {/* List */}
            <div className="lg:col-span-2">
               <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <tr>
                           <th className="p-4 w-24">Type</th>
                           <th className="p-4">Own Commission (%)</th>
                           <th className="p-4">Office Commission (%)</th>
                           <th className="p-4 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {Object.entries(localRates).sort(([a], [b]) => a.localeCompare(b)).map(([type, ratesVal]) => {
                           const rates = ratesVal as CommissionStructure;
                           return (
                           <tr key={type} className="hover:bg-slate-50 transition-colors group">
                              <td className="p-4">
                                 <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                                    {type}
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    <input 
                                       type="number" 
                                       min="0"
                                       step="0.1"
                                       value={rates.own}
                                       onChange={(e) => handleRateChange(type, 'own', e.target.value)}
                                       className="w-20 border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-fuchsia-500 outline-none font-medium text-slate-800"
                                    />
                                    <span className="text-slate-400">%</span>
                                 </div>
                              </td>
                              <td className="p-4">
                                 <div className="flex items-center gap-2">
                                    <input 
                                       type="number" 
                                       min="0"
                                       step="0.1"
                                       value={rates.office}
                                       onChange={(e) => handleRateChange(type, 'office', e.target.value)}
                                       className="w-20 border border-slate-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-fuchsia-500 outline-none font-medium text-slate-800"
                                    />
                                    <span className="text-slate-400">%</span>
                                 </div>
                              </td>
                              <td className="p-4 text-right">
                                 <button 
                                    onClick={() => handleDeleteType(type)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="Delete Type"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                              </td>
                           </tr>
                        );
                        })}
                     </tbody>
                  </table>
               </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default ManageCommissions;