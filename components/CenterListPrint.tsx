
import React, { useMemo } from 'react';
import { Center, Branch, Employee, CenterCollectionRecord } from '../types';
import { ShieldCheck, MapPin } from 'lucide-react';

interface CenterListPrintProps {
  centers: Center[];
  branches: Branch[];
  employees: Employee[];
  filterInfo: {
    branchName: string;
    employeeName: string;
    date: string;
  };
  records: CenterCollectionRecord[];
}

const CenterListPrint: React.FC<CenterListPrintProps> = ({ centers, branches, employees, filterInfo, records }) => {
  
  // Helper to get total for a center
  const getCenterTotals = (center: Center) => {
      // Logic: Strictly match BOTH Center Code and Branch ID.
      const relevant = records.filter(r => 
          r.centerCode === center.centerCode && 
          r.branchId === center.branchId
      );
      
      const coll = relevant.reduce((sum, r) => sum + r.amount, 0);
      const rec = relevant.reduce((sum, r) => sum + (r.loanAmount || 0), 0);
      return { coll, rec };
  };

  const stats = useMemo(() => {
      let own = 0;
      let office = 0;
      let totalColl = 0;
      let totalRec = 0;

      centers.forEach(c => {
          const type = c.type || (c.centerCode % 2 !== 0 ? 'OWN' : 'OFFICE');
          if (type === 'OWN') own++; else office++;

          const { coll, rec } = getCenterTotals(c);
          totalColl += coll;
          totalRec += rec;
      });
      return { own, office, totalColl, totalRec };
  }, [centers, records]);

  // Group by Branch for better organization
  const groupedCenters = useMemo(() => {
      const groups: Record<string, Center[]> = {};
      centers.forEach(c => {
          const bName = branches.find(b => b.id === c.branchId)?.name || 'Unknown Branch';
          if (!groups[bName]) groups[bName] = [];
          groups[bName].push(c);
      });
      return groups;
  }, [centers, branches]);

  return (
    <div 
      className="bg-white text-slate-900 font-sans mx-auto flex flex-col" 
      style={{ 
        width: '210mm', 
        minHeight: '297mm',
        padding: '10mm',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
        {/* HEADER - Clean and Professional */}
        <div className="border-b border-slate-300 pb-4 mb-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                        Angaria Development Foundation
                    </h1>
                    <p className="text-[10px] text-slate-500 mt-1 max-w-sm leading-tight">
                        Head Office: Khan Villa (2nd Floor), Bagchi Bazar, Angaria, Shariatpur
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-sm font-bold text-slate-800 uppercase tracking-wider border-2 border-slate-800 px-2 py-0.5 inline-block mb-1">
                        Center Master List
                    </div>
                    <div className="text-[9px] text-slate-500 space-y-0.5">
                        <p>Date: <span className="font-mono text-slate-700">{filterInfo.date}</span></p>
                        <p>Records: <span className="font-mono text-slate-700">{centers.length}</span></p>
                    </div>
                </div>
            </div>
            
            {/* Context Filters Display */}
            <div className="mt-3 flex gap-4 text-[10px] text-slate-600">
                <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    <span className="font-bold text-slate-400 uppercase mr-1">Branch:</span> 
                    <span className="font-bold">{filterInfo.branchName}</span>
                </div>
                <div className="bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    <span className="font-bold text-slate-400 uppercase mr-1">Officer:</span> 
                    <span className="font-bold">{filterInfo.employeeName}</span>
                </div>
            </div>
        </div>

        {/* SUMMARY STATS - Equal Width Cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/50">
                <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Total Collection</span>
                <span className="block text-base font-bold text-slate-900 font-mono">৳{stats.totalColl.toLocaleString()}</span>
            </div>
            <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/50">
                <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Total Recovery</span>
                <span className="block text-base font-bold text-slate-900 font-mono">৳{stats.totalRec.toLocaleString()}</span>
            </div>
            <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/50">
                <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">OWN Centers</span>
                <span className="block text-base font-bold text-blue-700 font-mono">{stats.own}</span>
            </div>
            <div className="border border-slate-200 rounded p-2 text-center bg-slate-50/50">
                <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">OFFICE Centers</span>
                <span className="block text-base font-bold text-emerald-700 font-mono">{stats.office}</span>
            </div>
        </div>

        {/* DATA CONTENT */}
        <div className="flex-1">
            {Object.keys(groupedCenters).length > 0 ? (
                Object.entries(groupedCenters).map(([branchName, branchCenters]) => {
                    const typedCenters = branchCenters as Center[];
                    return (
                    <div key={branchName} className="mb-6 break-inside-avoid">
                        <h3 className="text-xs font-bold text-slate-800 border-b-2 border-slate-800 pb-1 mb-2 flex items-center justify-between uppercase tracking-wide">
                            <span className="flex items-center gap-1"><MapPin size={10} /> {branchName}</span>
                            <span className="text-[9px] font-normal text-slate-500">{typedCenters.length} Centers</span>
                        </h3>
                        
                        <table className="w-full text-left border-collapse text-[10px]">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="py-2 px-2 font-bold border-b border-slate-300 w-12 text-center">Code</th>
                                    <th className="py-2 px-2 font-bold border-b border-slate-300">Center Name</th>
                                    <th className="py-2 px-2 font-bold border-b border-slate-300">Assigned Officer</th>
                                    <th className="py-2 px-2 font-bold border-b border-slate-300 text-right w-20">Collection</th>
                                    <th className="py-2 px-2 font-bold border-b border-slate-300 text-right w-20">Recovery</th>
                                    <th className="py-2 px-2 font-bold border-b border-slate-300 text-center w-16">Type</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {typedCenters.map((center, idx) => {
                                    const employee = employees.find(e => e.id === center.assignedEmployeeId);
                                    const type = center.type || (center.centerCode % 2 !== 0 ? 'OWN' : 'OFFICE');
                                    
                                    const { coll, rec } = getCenterTotals(center);

                                    return (
                                        <tr key={center.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 border-r border-slate-100">
                                                {center.centerCode}
                                            </td>
                                            <td className="py-2 px-2 font-semibold border-r border-slate-100">
                                                {center.centerName}
                                            </td>
                                            <td className="py-2 px-2 border-r border-slate-100">
                                                {employee ? (
                                                    <div>
                                                        <span className="font-medium text-slate-800">{employee.name}</span>
                                                        <span className="text-[8px] text-slate-400 block uppercase">{employee.designation}</span>
                                                    </div>
                                                ) : <span className="text-slate-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono font-medium border-r border-slate-100">
                                                {coll > 0 ? `৳${coll.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="py-2 px-2 text-right font-mono font-medium border-r border-slate-100">
                                                {rec > 0 ? `৳${rec.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                    type === 'OWN' 
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                }`}>
                                                    {type}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    );
                })
            ) : (
                <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-slate-400 font-medium">No centers found.</p>
                </div>
            )}
        </div>

        {/* FOOTER */}
        <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold uppercase tracking-wide">
                <ShieldCheck size={10} /> Confidential Document
            </span>
            <span className="font-medium">
                Generated by System <span className="mx-1 text-slate-300">|</span> Thanks from <span className="font-bold text-slate-600">Divix</span>
            </span>
        </div>
    </div>
  );
};

export default CenterListPrint;
