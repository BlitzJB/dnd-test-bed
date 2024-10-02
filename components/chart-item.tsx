'use client'

import React, { useMemo } from 'react'
import { Chart as ChartJS, registerables, ChartTypeRegistry } from 'chart.js'
import { Chart } from 'react-chartjs-2'

ChartJS.register(...registerables)

const ENABLE_BINNING = true // Set this to true to enable data binning/processing
const MAX_DATA_POINTS = 100
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

interface ChartConfig {
  id: string
  graph_type: string
  x_axis: string
  y_axis: string
  color: string | null
  title: string
}

interface ChartData {
  [key: string]: string | number
}

interface ChartItemProps {
  config: ChartConfig
  data: ChartData[]
}

function processData(data: ChartData[], config: ChartConfig, maxPoints: number) {
  const { graph_type, x_axis, y_axis, color } = config

  if (data.length <= maxPoints) return data

  switch (graph_type) {
    case 'scatter':
    case 'line':
      return sampleData(data, maxPoints)
    case 'bar':
    case 'stacked_bar':
    case 'grouped_bar':
    case 'pie':
      return aggregateData(data, x_axis, y_axis, color)
    default:
      return data
  }
}

function sampleData(data: ChartData[], maxPoints: number): ChartData[] {
  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, index) => index % step === 0)
}

function aggregateData(data: ChartData[], xAxis: string, yAxis: string, color: string | null): ChartData[] {
  const aggregated: { [key: string]: ChartData } = {}

  data.forEach(item => {
    const key = String(item[xAxis])
    if (!aggregated[key]) {
      aggregated[key] = { [xAxis]: item[xAxis], [yAxis]: 0 }
      if (color) aggregated[key][color] = 0
    }
    aggregated[key][yAxis] = Number(aggregated[key][yAxis]) + Number(item[yAxis])
    if (color) aggregated[key][color] = Number(aggregated[key][color]) + Number(item[color] || 0)
  })

  return Object.values(aggregated)
}

export function ChartItem({ config, data }: ChartItemProps) {
  const { graph_type, x_axis, y_axis, color, title } = config

  const processedData = useMemo(() => {
    if (!data || data.length === 0) return null
    return ENABLE_BINNING ? processData(data, config, MAX_DATA_POINTS) : data
  }, [data, config])

  const chartData = useMemo(() => {
    if (!processedData) return null

    const labels = processedData.map(item => item[x_axis])
    const values = processedData.map(item => item[y_axis])
    const colorValues = color ? processedData.map(item => item[color]) : []

    return {
      labels,
      datasets: [
        {
          label: y_axis,
          data: values,
          backgroundColor: COLORS[0],
          borderColor: COLORS[0],
        },
        ...(color ? [{
          label: color,
          data: colorValues,
          backgroundColor: COLORS[1],
          borderColor: COLORS[1],
        }] : []),
      ],
    }
  }, [processedData, x_axis, y_axis, color])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            const total = data.length // Use original data length
            return `${label}: ${value}${ENABLE_BINNING ? ` (Total data points: ${total})` : ''}`
          }
        }
      }
    },
  }), [title, data.length])

  const chartType = useMemo((): keyof ChartTypeRegistry => {
    switch (graph_type) {
      case 'scatter':
        return 'scatter'
      case 'bar':
      case 'stacked_bar':
      case 'grouped_bar':
        return 'bar'
      case 'heatmap':
        return 'scatter' // Approximation
      case 'box':
        return 'line' // Approximation
      case 'pie':
        return 'pie'
      default:
        return 'bar'
    }
  }, [graph_type])

  if (!chartData) {
    return <div className="text-center p-4">No data available for {config.title}</div>
  }

  return (
    <div className="w-full h-full" style={{ minHeight: '200px', height: '300px' }}>
      <Chart 
        type={chartType} 
        data={chartData} 
        options={options}
      />
    </div>
  )
}