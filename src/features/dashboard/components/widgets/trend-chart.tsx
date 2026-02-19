"use client";

import ReactECharts from "echarts-for-react";
import { useDashboardStore } from "@/store/dashboard-store";
import { useTheme } from "next-themes";
import { graphic } from "echarts";

export function TrendChart() {
    const { dataset, comparisonMode } = useDashboardStore();

    // Mock data for demonstration if dataset is null
    // In production, this would aggregate `dataset` based on `comparisonMode`
    const dateData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const currentData = [820, 932, 901, 934, 1290, 1330, 1320];
    const previousData = [720, 832, 801, 834, 1190, 1230, 1220];

    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true,
            borderColor: 'rgba(255,255,255,0.1)'
        },
        xAxis: [
            {
                type: 'category',
                boundaryGap: false,
                data: dateData,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.3)' } },
                axisLabel: { color: 'rgba(255,255,255,0.6)' }
            }
        ],
        yAxis: [
            {
                type: 'value',
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: 'rgba(255,255,255,0.6)' }
            }
        ],
        series: [
            {
                name: 'Actual',
                type: 'line',
                smooth: true,
                lineStyle: {
                    width: 0
                },
                showSymbol: false,
                areaStyle: {
                    opacity: 0.8,
                    color: new graphic.LinearGradient(0, 0, 0, 1, [
                        {
                            offset: 0,
                            color: 'rgb(0, 221, 255)'
                        },
                        {
                            offset: 1,
                            color: 'rgba(77, 119, 255, 0)'
                        }
                    ])
                },
                emphasis: {
                    focus: 'series'
                },
                data: currentData
            },
            {
                name: 'Anterior',
                type: 'line',
                smooth: true,
                lineStyle: {
                    color: '#9b51e0',
                    width: 2,
                    type: 'dashed'
                },
                showSymbol: false,
                emphasis: {
                    focus: 'series'
                },
                data: previousData
            }
        ]
    };

    return (
        <div className="h-[300px] w-full">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
}
