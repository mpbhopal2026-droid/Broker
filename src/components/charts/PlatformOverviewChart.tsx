'use client';

import React, { useState } from 'react';
import { Info, ChevronDown } from 'lucide-react';

export const PlatformOverviewChart: React.FC = () => {
  const [range, setRange] = useState('7 Days');

  const days = ['16 May', '17 May', '18 May', '19 May', '20 May', '21 May', '22 May'];
  
  // Data series matching the reference image
  // Deposits (Green) ~20k-30k
  const deposits = [21000, 22000, 25000, 29000, 27500, 26000, 30000];
  // New Users (Purple) ~10k-15k
  const newUsers = [11000, 11500, 12000, 15000, 13000, 12500, 15500];
  // Withdrawals (Orange) ~3k-5k
  const withdrawals = [3000, 3500, 3200, 4800, 4200, 3800, 4900];

  const maxVal = 40000;
  const width = 560;
  const height = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const getX = (index: number) => padLeft + (index / (days.length - 1)) * chartW;
  const getY = (val: number) => padTop + chartH - (val / maxVal) * chartH;

  const buildPath = (data: number[]) => {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)},${getY(d).toFixed(1)}`).join(' ');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">Platform Overview</h3>
          <button title="Platform performance across user registrations and financial flows" className="text-slate-400 hover:text-slate-600">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Legend & Dropdown */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#6366f1]" />
              New Users
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              Deposits
            </span>
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              Withdrawals
            </span>
          </div>

          <div className="relative">
            <button className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <span>{range}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full overflow-hidden" style={{ height: height }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full">
          
          {/* Y Axis Grid Lines */}
          {[0, 10000, 20000, 30000, 40000].map((val) => {
            const y = getY(val);
            return (
              <g key={val}>
                <line x1={padLeft} y1={y} x2={width - padRight} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={padLeft - 8} y={y + 3.5} fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="end">
                  {val === 0 ? '0' : `${val / 1000}K`}
                </text>
              </g>
            );
          })}

          {/* Deposits Line (Green) */}
          <path d={buildPath(deposits)} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {deposits.map((d, i) => (
            <circle key={`dep-${i}`} cx={getX(i)} cy={getY(d)} r="3" fill="#10b981" />
          ))}

          {/* New Users Line (Purple) */}
          <path d={buildPath(newUsers)} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {newUsers.map((d, i) => (
            <circle key={`usr-${i}`} cx={getX(i)} cy={getY(d)} r="3" fill="#6366f1" />
          ))}

          {/* Withdrawals Line (Orange) */}
          <path d={buildPath(withdrawals)} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {withdrawals.map((d, i) => (
            <circle key={`wth-${i}`} cx={getX(i)} cy={getY(d)} r="3" fill="#f97316" />
          ))}

          {/* X Axis Labels */}
          {days.map((day, i) => (
            <text key={day} x={getX(i)} y={height - 8} fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="middle">
              {day}
            </text>
          ))}

        </svg>
      </div>

    </div>
  );
};
