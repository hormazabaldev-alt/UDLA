"use client";

import ReactECharts from "echarts-for-react";

export function GaugeChart({ value = 75, title = "Score" }: { value?: number, title?: string }) {
    const option = {
        backgroundColor: 'transparent',
        series: [
            {
                type: 'gauge',
                startAngle: 90,
                endAngle: -270,
                pointer: { show: false },
                progress: {
                    show: true,
                    overlap: false,
                    roundCap: true,
                    clip: false,
                    itemStyle: {
                        borderWidth: 1,
                        borderColor: '#464646'
                    }
                },
                axisLine: {
                    lineStyle: {
                        width: 40
                    }
                },
                splitLine: { show: false },
                axisTick: { show: false },
                axisLabel: { show: false },
                data: [
                    {
                        value: value,
                        name: title,
                        title: {
                            offsetCenter: ['0%', '-20%'],
                            fontSize: 12,
                            color: '#fff'
                        },
                        detail: {
                            valueAnimation: true,
                            offsetCenter: ['0%', '20%'],
                            fontSize: 20,
                            fontWeight: 'bold',
                            color: 'inherit',
                            formatter: '{value}%'

                        }
                    }
                ],
                detail: {
                    fontSize: 24,
                    color: 'auto',
                    borderColor: 'auto',
                    borderRadius: 20,
                    borderWidth: 1,
                    formatter: '{value}%'
                }
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
