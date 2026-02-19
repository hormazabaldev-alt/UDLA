"use client";

import ReactECharts from "echarts-for-react";

export function GaugeChart({ value = 75, title = "Score" }: { value?: number, title?: string }) {
    const option = {
        backgroundColor: 'transparent',
        series: [
            {
                type: 'gauge',
                startAngle: 180,
                endAngle: 0,
                pointer: { show: false },
                progress: {
                    show: true,
                    overlap: false,
                    roundCap: true,
                    clip: false,
                    itemStyle: {
                        color: {
                            type: 'linear',
                            x: 0, y: 0, x2: 1, y2: 0,
                            colorStops: [
                                { offset: 0, color: '#0ea5e9' },
                                { offset: 1, color: '#00d4ff' },
                            ],
                        }
                    }
                },
                axisLine: {
                    lineStyle: {
                        width: 10,
                        color: [[1, 'rgba(255,255,255,0.08)']],
                    }
                },
                axisTick: { show: false },
                splitLine: { show: false },
                axisLabel: { show: false },
                detail: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#00d4ff',
                    offsetCenter: [0, '10%'],
                    formatter: '{value}%',
                },
                title: {
                    show: !!title,
                    offsetCenter: [0, '35%'],
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.5)',
                },
                data: [{ value, name: title }],
                radius: '95%',
                center: ['50%', '65%'],
            }
        ]
    };

    return (
        <ReactECharts
            option={option}
            style={{ height: '100%', width: '100%' }}
            opts={{ renderer: 'svg' }}
        />
    );
}
