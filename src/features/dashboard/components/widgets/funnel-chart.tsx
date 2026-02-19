"use client";

import ReactECharts from "echarts-for-react";

export function FunnelChart() {
    const option = {
        backgroundColor: 'transparent',
        tooltip: {
            trigger: 'item',
            formatter: '{b} : {c}%'
        },
        series: [
            {
                name: 'Funnel',
                type: 'funnel',
                left: '10%',
                top: 60,
                bottom: 60,
                width: '80%',
                min: 0,
                max: 100,
                minSize: '0%',
                maxSize: '100%',
                sort: 'descending',
                gap: 2,
                label: {
                    show: true,
                    position: 'inside',
                    color: '#fff',
                    formatter: '{b}'
                },
                labelLine: {
                    length: 10,
                    lineStyle: {
                        width: 1,
                        type: 'solid'
                    }
                },
                itemStyle: {
                    borderColor: 'transparent',
                    borderWidth: 1,
                    shadowBlur: 20,
                    shadowColor: 'rgba(0, 0, 0, 0.5)'
                },
                data: [
                    { value: 60, name: 'Visits' },
                    { value: 40, name: 'Inquiries' },
                    { value: 20, name: 'Order' },
                    { value: 80, name: 'Clicks' },
                    { value: 100, name: 'Show' }
                ].map((item, index) => ({
                    ...item,
                    itemStyle: {
                        color: index % 2 === 0 ? '#06d0f9' : '#9b51e0',
                        opacity: 0.7 - index * 0.1
                    }
                }))
            }
        ]
    };

    return (
        <div className="h-full w-full min-h-[300px]">
            <ReactECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
            />
        </div>
    );
}
