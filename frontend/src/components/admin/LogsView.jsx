import React from 'react';
import { FileText, Activity, Clock } from 'lucide-react';

const LogsView = ({ logs }) => {
    const getActionColor = (action) => {
        if (action?.includes('ADD')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (action?.includes('DELETE')) return 'bg-red-50 text-red-500 border-red-100';
        if (action?.includes('UPDATE')) return 'bg-blue-50 text-blue-600 border-blue-100';
        if (action?.includes('IMPORT')) return 'bg-purple-50 text-purple-600 border-purple-100';
        return 'bg-gray-50 text-gray-600 border-gray-100';
    };

    const getActionIcon = (action) => {
        if (action?.includes('ADD')) return '➕';
        if (action?.includes('DELETE')) return '🗑️';
        if (action?.includes('UPDATE')) return '✏️';
        if (action?.includes('IMPORT')) return '📦';
        if (action?.includes('LOGIN')) return '🔐';
        return '📋';
    };

    return (
        <div className="space-y-5 animate-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-[20px] font-bold text-gray-900">Nhật ký hoạt động</h2>
                    <p className="text-[13px] text-gray-400">{logs.length} hoạt động gần đây</p>
                </div>
            </div>

            {/* Timeline */}
            {logs.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                    <Activity size={48} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-bold text-gray-400">Chưa có hoạt động nào</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {logs.map((log, i) => (
                        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-3">
                            <div className="text-[16px] mt-0.5 flex-shrink-0">{getActionIcon(log.action)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border ${getActionColor(log.action)}`}>
                                        {log.action}
                                    </span>
                                </div>
                                <p className="text-[13px] text-gray-700 mt-1 font-medium">{log.details}</p>
                                <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                                    <Clock size={11} />
                                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LogsView;
