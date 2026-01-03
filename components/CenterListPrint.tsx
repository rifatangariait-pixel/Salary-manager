
import React, { useMemo } from 'react';
import { Center, Branch, Employee, CenterCollectionRecord } from '../types';
import { Building, ShieldCheck, MapPin } from 'lucide-react';

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
      // Logic: Match on Code. If Code matches, assume it belongs to this center definition
      // unless the system has duplicate codes in different branches.
      // This allows historical records (from old branch) to be counted under new branch assignment.
      const relevant = records.filter(r => r.centerCode === center.centerCode);
      
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
        height: 'auto', // Allow automatic height for continuous PDF
        minHeight: '297mm', // Minimum A4
        padding: '15mm',
        boxSizing: 'border-box',
        position: 'relative'
      }}
    >
        {/* DECORATIVE HEADER */}
        <div className="border-b-4 border-slate-800 pb-4 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Building size={120} />
            </div>
            
            <div className="flex justify-between items-end relative z-10">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 uppercase tracking-wide leading-none">
                        Angaria Development
                    </h1>
                    <h2 className="text-xl font-bold text-slate-600 uppercase tracking-widest mt-1">
                        Foundation
                    </h2>
                    <p className="text-xs text-slate-500 mt-2 font-medium max-w-sm">
                        Head Office: Khan Villa (2nd Floor), Bagchi Bazar, Angaria, Shariatpur
                    </p>
                </div>
                <div className="text-right">
                    <div className="bg-slate-900 text-white px-4 py-1.5 text-sm font-bold uppercase tracking-widest inline-block mb-2 shadow-sm">
                        Center Master List
                    </div>
                    <p className="text-xs font-bold text-slate-700">Date: <span className="font-mono font-normal">{filterInfo.date}</span></p>
                    <p className="text-xs font-bold text-slate-700">Total Records: <span className="font-mono font-normal">{centers.length}</span></p>
                </div>
            </div>
        </div>

        {/* SUMMARY STATS STRIP */}
        <div className="flex border border-slate-200 rounded-lg bg-slate-50 p-3 mb-6 gap-6 items-center shadow-sm">
            <div className="flex-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Filters Applied</p>
                <div className="flex gap-4 mt-1">
                    <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        Branch: {filterInfo.branchName}
                    </span>
                    <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        Officer: {filterInfo.employeeName}
                    </span>
                </div>
            </div>
            <div className="flex gap-4 border-l border-slate-200 pl-6">
                <div className="text-center px-2 border-r border-slate-200">
                    <span className="block text-xl font-bold text-slate-800 leading-none">৳{stats.totalColl.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Collection</span>
                </div>
                <div className="text-center px-2 border-r border-slate-200">
                    <span className="block text-xl font-bold text-slate-800 leading-none">৳{stats.totalRec.toLocaleString()}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">Recovery</span>
                </div>
                <div className="text-center">
                    <span className="block text-xl font-bold text-blue-700 leading-none">{stats.own}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">OWN</span>
                </div>
                <div className="text-center">
                    <span className="block text-xl font-bold text-emerald-700 leading-none">{stats.office}</span>
                    <span className="text-[9px] text-slate-500 uppercase font-bold">OFFICE</span>
                </div>
            </div>
        </div>

        {/* DATA CONTENT - Grouped by Branch */}
        <div className="flex-1 space-y-6">
            {Object.keys(groupedCenters).length > 0 ? (
                Object.entries(groupedCenters).map(([branchName, branchCenters]) => {
                    // Fix for TS error: explicit cast for iteration
                    const typedCenters = branchCenters as Center[];
                    return (
                    <div key={branchName} className="mb-6 break-inside-avoid">
                        <h3 className="text-sm font-bold text-white bg-slate-700 px-3 py-1.5 uppercase tracking-wide mb-0 flex items-center gap-2">
                            <MapPin size={12} /> {branchName} <span className="opacity-60 text-[10px] font-normal ml-auto">{typedCenters.length} Centers</span>
                        </h3>
                        <table className="w-full text-left border-collapse text-[11px] border border-slate-300">
                            <thead className="bg-slate-100 text-slate-700">
                                <tr>
                                    <th className="py-2 px-3 font-bold border-b border-r border-slate-300 w-16 text-center">Code</th>
                                    <th className="py-2 px-3 font-bold border-b border-r border-slate-300">Center Name</th>
                                    <th className="py-2 px-3 font-bold border-b border-r border-slate-300">Assigned Officer</th>
                                    <th className="py-2 px-3 font-bold border-b border-r border-slate-300 text-right w-24">Collection</th>
                                    <th className="py-2 px-3 font-bold border-b border-r border-slate-300 text-right w-24">Recovery</th>
                                    <th className="py-2 px-3 font-bold border-b border-slate-300 text-center w-20">Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {typedCenters.map((center, idx) => {
                                    const employee = employees.find(e => e.id === center.assignedEmployeeId);
                                    const type = center.type || (center.centerCode % 2 !== 0 ? 'OWN' : 'OFFICE');
                                    const isEven = idx % 2 === 0;
                                    
                                    // Calculate row totals (Using helper that ignores branch mismatch)
                                    const { coll, rec } = getCenterTotals(center);

                                    return (
                                        <tr key={center.id} className={`${isEven ? 'bg-white' : 'bg-slate-50/50'}`}>
                                            <td className="py-2 px-3 border-r border-b border-slate-200 text-center font-mono font-bold text-slate-700">
                                                {center.centerCode}
                                            </td>
                                            <td className="py-2 px-3 border-r border-b border-slate-200 font-semibold text-slate-800">
                                                {center.centerName}
                                            </td>
                                            <td className="py-2 px-3 border-r border-b border-slate-200 text-slate-600">
                                                {employee ? (
                                                    <div>
                                                        <span className="font-medium text-slate-800">{employee.name}</span>
                                                        <span className="text-[9px] text-slate-400 block">{employee.designation}</span>
                                                    </div>
                                                ) : <span className="text-slate-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="py-2 px-3 border-r border-b border-slate-200 text-right font-mono font-medium text-slate-700">
                                                {coll > 0 ? `৳${coll.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="py-2 px-3 border-r border-b border-slate-200 text-right font-mono font-medium text-slate-700">
                                                {rec > 0 ? `৳${rec.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="py-2 px-3 border-b border-slate-200 text-center">
                                                <span className={`inline-block px-3 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                                    type === 'OWN' 
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
                <div className="py-12 text-center border-2 border-dashed border-slate-300 rounded-lg">
                    <p className="text-slate-400 font-medium">No centers found matching the selection.</p>
                </div>
            )}
        </div>

        {/* FOOTER */}
        <div className="mt-8 pt-4 border-t-2 border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
            <span className="flex items-center gap-1 font-bold uppercase">
                <ShieldCheck size={12} /> Confidential Internal Document
            </span>
            <span className="flex items-center gap-1 font-medium text-slate-400">
                Generated by Multi-Branch Salary System <span className="mx-1">•</span> Thanks from <span className="font-bold text-slate-600">Divix</span>
            </span>
        </div>
    </div>
  );
};

export default CenterListPrint;
