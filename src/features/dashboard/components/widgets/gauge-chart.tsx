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
                min: 0,
                max: 100,
                splitNumber: 8,
                axisLine: {
                    lineStyle: {
                        width: 6,
                        color: [
                            [0.25, '#FF6E76'],
                            [0.5, '#FDDD60'],
                            [0.75, '#58D9F9'],
                            [1, '#7CFFB2']
                        ]
                    }
                },
                pointer: {
                    icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                    length: '12%',
                    width: 20,
                    offsetCenter: [0, '-60%'],
                    itemStyle: {
                        color: 'auto'
                    }
                },
                axisTick: {
                    length: 12,
                    lineStyle: {
                        color: 'auto',
                        width: 2
                    }
                },
                splitLine: {
                    length: 20,
                    lineStyle: {
                        color: 'auto',
                        width: 5
                    }
                },
                axisLabel: {
                    color: '#fff', // White text
                    fontSize: 10,
                    distance: -40, // Move labels inside
                    formatter: function (value: number) {
                        if (value === 87.5) {
                            return 'A';
                        } else if (value === 62.5) {
                            return 'B';
                        } else if (value === 37.5) {
                            return 'C';
                        } else if (value === 12.5) {
                            return 'D';
                        }
                        return '';
                    }
                },
                title: {
                    offsetCenter: [0, '-20%'],
                    fontSize: 14,
                    color: '#fff'
                },
                detail: {
                    fontSize: 20,
                    offsetCenter: [0, '0%'],
                    valueAnimation: true,
                    formatter: function (value: number) {
                        return Math.round(value) + '%';
                    },
                    color: 'auto'
                },
                data: [
                    {
                        value: value,
                        name: title
                    }
                ]
            }
        ]
    };

    return (
        <div className="h-full w-full min-h-[160px]">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
}
