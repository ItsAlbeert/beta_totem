
"use client";

import React from 'react';
import { ResponsiveContainer, LineChart, AreaChart, BarChart, PieChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, Area, Bar, Pie, Cell } from 'recharts';

// 1. ESTRUCTURA BASE DE CONTENEDOR DE GRÁFICA
export const ChartContainer = ({ title, icon, children, className = "" }: { title: string, icon?: React.ReactNode, children: React.ReactNode, className?: string }) => (
  <div className={`bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 ${className}`}>
    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
      {icon && <span className="w-5 h-5 text-purple-400">{icon}</span>}
      {title}
    </h3>
    <div className="w-full h-[300px]">
      {children}
    </div>
  </div>
);

// 2. TOOLTIP PERSONALIZADO MODERNO
export const ModernTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-2xl">
        <p className="text-gray-300 text-sm mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-white font-medium" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 3. DEFINICIONES DE GRADIENTES REUTILIZABLES
export const chartGradients = {
  purple: (
    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
    </linearGradient>
  ),
  blue: (
    <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.1}/>
    </linearGradient>
  ),
  green: (
    <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10B981" stopOpacity={0.9}/>
      <stop offset="95%" stopColor="#10B981" stopOpacity={0.6}/>
    </linearGradient>
  ),
  orange: (
    <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.1}/>
    </linearGradient>
  )
};

// 4. CONFIGURACIÓN BASE PARA EJES Y GRILLAS
export const axisConfig = {
  cartesianGrid: {
    strokeDasharray: "3 3",
    stroke: "#374151"
  },
  xAxis: {
    stroke: "#9CA3AF",
    fontSize: 12
  },
  yAxis: {
    stroke: "#9CA3AF",
    fontSize: 12
  }
};

// 5. TARJETA DE ESTADÍSTICA MODERNA
export const StatCard = ({ icon, title, value, change, gradientColor }: { icon: React.ReactNode, title: string, value: string | number, change: number, gradientColor: string }) => (
  <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:transform hover:scale-105 hover:shadow-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-gradient-to-r ${gradientColor}`}>
        {icon}
      </div>
      <div className={`text-sm font-medium px-2 py-1 rounded-full ${
        change > 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
      }`}>
        {change > 0 ? '+' : ''}{change}%
      </div>
    </div>
    <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
    <p className="text-white text-2xl font-bold">{value}</p>
  </div>
);

// 6. PATRONES DE DISEÑO PARA DIFERENTES TIPOS DE GRÁFICAS

// Gráfica de Barras Moderna
export const ModernBarChart = ({ data, dataKey }: { data: any[], dataKey: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
      <defs>{chartGradients.green}</defs>
      <CartesianGrid horizontal={false} {...axisConfig.cartesianGrid} />
      <XAxis type="number" {...axisConfig.xAxis} />
      <YAxis dataKey="name" type="category" {...axisConfig.yAxis} width={80} tickLine={false} axisLine={false} />
      <Tooltip content={<ModernTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.1)'}} />
      <Bar 
        dataKey={dataKey} 
        fill="url(#greenGradient)"
        radius={[0, 4, 4, 0]}
        barSize={15}
      />
    </BarChart>
  </ResponsiveContainer>
);

// Gráfica Circular Moderna
export const ModernPieChart = ({ data }: { data: { name: string, value: number, color: string }[]}) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie
        data={data}
        cx="50%"
        cy="50%"
        innerRadius={60}
        outerRadius={80}
        paddingAngle={5}
        dataKey="value"
        animationBegin={0}
        animationDuration={1000}
        cornerRadius={5}
      >
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
        ))}
      </Pie>
      <Tooltip content={<ModernTooltip />} />
      <Legend 
        verticalAlign="bottom" 
        height={36}
        iconType="circle"
        wrapperStyle={{ color: '#9CA3AF', fontSize: '12px' }}
      />
    </PieChart>
  </ResponsiveContainer>
);
