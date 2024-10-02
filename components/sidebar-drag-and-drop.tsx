'use client'

import React, { useState, useCallback } from 'react'
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDroppable, DragStartEvent, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SortableItem } from './sortable-item'
import { CSS } from '@dnd-kit/utilities'
import Papa from 'papaparse'
import { Button } from "@/components/ui/button"
import { ChartItem } from './chart-item'

interface ChartConfig {
  id: string
  graph_type: string
  x_axis: string
  y_axis: string
  color: string | null
  title: string
}

interface GridSlot {
  id: string
  colspan: number
  item: ChartConfig | null
}

interface ChartData {
  [key: string]: string | number
}

const initialChartConfigs: ChartConfig[] = [
  {
    "id": "chart1",
    "graph_type": "scatter",
    "x_axis": "Age",
    "y_axis": "MonthlyIncome",
    "color": null,
    "title": "Age vs. Monthly Income Distribution"
  },
  {
    "id": "chart2",
    "graph_type": "scatter",
    "x_axis": "YearsAtCompany",
    "y_axis": "PerformanceRating",
    "color": null,
    "title": "Years at Company vs. Performance Rating"
  },
  {
    "id": "chart3",
    "graph_type": "bar",
    "x_axis": "Department",
    "y_axis": "EmployeeCount",
    "color": null,
    "title": "Employee Distribution by Department"
  },
  {
    "id": "chart4",
    "graph_type": "stacked_bar",
    "x_axis": "Department",
    "y_axis": "EmployeeCount",
    "color": "Attrition",
    "title": "Attrition by Department"
  },
  {
    "id": "chart5",
    "graph_type": "heatmap",
    "x_axis": "JobSatisfaction",
    "y_axis": "WorkLifeBalance",
    "color": "EmployeeCount",
    "title": "Job Satisfaction vs. Work Life Balance"
  },
  {
    "id": "chart6",
    "graph_type": "box",
    "x_axis": "Attrition",
    "y_axis": "DistanceFromHome",
    "color": null,
    "title": "Distance From Home vs. Attrition"
  },
  {
    "id": "chart7",
    "graph_type": "box",
    "x_axis": "Education",
    "y_axis": "MonthlyIncome",
    "color": null,
    "title": "Education Level vs. Monthly Income"
  },
  {
    "id": "chart8",
    "graph_type": "scatter",
    "x_axis": "YearsSinceLastPromotion",
    "y_axis": "JobSatisfaction",
    "color": null,
    "title": "Years Since Last Promotion vs. Job Satisfaction"
  },
  {
    "id": "chart9",
    "graph_type": "pie",
    "x_axis": "AgeGroup",
    "y_axis": "EmployeeCount",
    "color": null,
    "title": "Age Group Distribution"
  },
  {
    "id": "chart10",
    "graph_type": "grouped_bar",
    "x_axis": "OverTime",
    "y_axis": "EmployeeCount",
    "color": "WorkLifeBalance",
    "title": "Overtime vs. Work Life Balance"
  }
]

const initialGridSlots: GridSlot[] = [
  { id: 'slot1', colspan: 2, item: null },
  { id: 'slot2', colspan: 1, item: null },
  { id: 'slot3', colspan: 3, item: null },
  { id: 'slot4', colspan: 1, item: null },
  { id: 'slot5', colspan: 3, item: null },
  { id: 'slot6', colspan: 2, item: null },
]

function Droppable(props: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: props.id,
  })

  return (
    <div ref={setNodeRef}>
      {props.children}
    </div>
  )
}

export function SidebarDragAndDrop() {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>(initialChartConfigs)
  const [gridSlots, setGridSlots] = useState<GridSlot[]>(initialGridSlots)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedItem, setDraggedItem] = useState<ChartConfig | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id.toString().replace(/^(sidebar|slot)-/, '')
    const item = chartConfigs.find(item => item.id === id) || 
                 gridSlots.find(slot => slot.item?.id === id)?.item || 
                 null
    setDraggedItem(item)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return

    const activeId = active.id.toString().replace(/^(sidebar|slot)-/, '')
    const overId = over.id.toString().replace(/^(sidebar|slot)-/, '')

    const activeContainer = active.id.toString().startsWith('sidebar') ? 'sidebar' : 'grid'
    const overContainer = over.id.toString().startsWith('sidebar') ? 'sidebar' : 'grid'

    if (activeContainer !== overContainer) {
      transferBetweenContainers(activeContainer, overContainer, activeId, overId)
    } else if (activeContainer === 'grid') {
      moveWithinGrid(activeId, overId)
    } else {
      const oldIndex = chartConfigs.findIndex(item => item.id === activeId)
      const newIndex = chartConfigs.findIndex(item => item.id === overId)

      if (oldIndex !== -1 && newIndex !== -1) {
        setChartConfigs(items => {
          const newItems = [...items]
          const [reorderedItem] = newItems.splice(oldIndex, 1)
          newItems.splice(newIndex, 0, reorderedItem)
          return newItems
        })
      }
    }

    setActiveId(null)
    setDraggedItem(null)
  }

  function transferBetweenContainers(from: string, to: string, itemId: string, slotId: string) {
    if (from === 'sidebar' && to === 'grid') {
      const item = chartConfigs.find(item => item.id === itemId)
      if (!item) return

      setChartConfigs(items => items.filter(i => i.id !== itemId))
      setGridSlots(slots => slots.map(slot =>
        slot.id === slotId ? { ...slot, item } : slot
      ))
    } else if (from === 'grid' && to === 'sidebar') {
      const slot = gridSlots.find(slot => slot.item?.id === itemId)
      if (!slot || !slot.item) return

      setGridSlots(slots => slots.map(s =>
        s.id === slot.id ? { ...s, item: null } : s
      ))
      setChartConfigs(items => [...items, slot.item as ChartConfig])
    }
  }

  function moveWithinGrid(fromId: string, toId: string) {
    setGridSlots(slots => {
      const newSlots = [...slots]
      const fromIndex = newSlots.findIndex(slot => slot.item?.id === fromId)
      const toIndex = newSlots.findIndex(slot => slot.id === toId)

      if (fromIndex !== -1 && toIndex !== -1) {
        const [movedItem] = newSlots.splice(fromIndex, 1, { ...newSlots[fromIndex], item: null })
        newSlots[toIndex] = { ...newSlots[toIndex], item: movedItem.item }
      }

      return newSlots
    })
  }

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        complete: (results) => {
          if (Array.isArray(results.data) && results.data.length > 0) {
            let headers: string[] = []
            let dataRows: any[][] = []

            if (typeof results.data[0] === 'object' && results.data[0] !== null) {
              headers = Object.keys(results.data[0] as Record<string, unknown>)
              dataRows = results.data.map(row => Object.values(row as Record<string, unknown>))
            } else if (Array.isArray(results.data[0])) {
              headers = results.data[0] as string[]
              dataRows = results.data.slice(1) as any[][]
            }

            const chartData: ChartData[] = dataRows.map(row => {
              const rowData: ChartData = {}
              headers.forEach((header, index) => {
                const value = row[index]
                rowData[header] = isNaN(Number(value)) ? value : Number(value)
              })
              return rowData
            })

            setChartData(chartData)
            setDataLoaded(true)

            setTimeout(() => {
              setChartConfigs(prevConfigs => [...prevConfigs])
              setGridSlots(prevSlots => prevSlots.map(slot => 
                slot.item ? { ...slot, item: { ...slot.item } } : slot
              ))
            }, 100)
          }
        },
        header: true,
        dynamicTyping: true,
      })
    }
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Sidebar */}
        <Droppable id="sidebar">
          <div className="w-64 bg-muted p-4 border-r flex flex-col">
            <h2 className="text-lg font-semibold mb-4">Chart Items</h2>
            <ScrollArea className="flex-grow mb-4">
              <SortableContext items={chartConfigs.map(item => `sidebar-${item.id}`)} strategy={rectSortingStrategy}>
                <ul className="space-y-2">
                  {chartConfigs.map((item) => (
                    <SortableItem key={`sidebar-${item.id}`} id={`sidebar-${item.id}`}>
                      <div className="p-2 bg-card rounded-md shadow cursor-move">
                        <ChartItem key={`sidebar-${item.id}-${dataLoaded}`} config={item} data={chartData} />
                      </div>
                    </SortableItem>
                  ))}
                </ul>
              </SortableContext>
            </ScrollArea>
            <div className="mt-auto">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button
                asChild
                variant="default"
                className="w-full"
              >
                <label htmlFor="csv-upload">
                  Upload CSV
                </label>
              </Button>
            </div>
          </div>
        </Droppable>

        {/* Main Content */}
        <div className="p-4 flex-grow">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Main Content</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <SortableContext items={gridSlots.map(slot => `slot-${slot.id}`)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-6 auto-rows-min gap-4">
                    {gridSlots.map((slot) => (
                      <div key={slot.id} className="h-full relative" style={{ gridColumn: `span ${slot.colspan}`, minHeight: '200px' }}>
                        <Droppable key={slot.id} id={`slot-${slot.id}`}>
                          <div
                            className={`p-4 bg-secondary rounded-lg shadow h-full min-h-[200px] flex items-center justify-center`}
                          >
                            {slot.item ? (
                              <SortableItem id={`slot-${slot.item.id}`}>
                                <div className="w-full h-full flex items-center justify-center">
                                  <ChartItem 
                                    key={`chart-${slot.item.id}-${dataLoaded}-${chartData.length}`} 
                                    config={slot.item} 
                                    data={chartData} 
                                  />
                                </div>
                              </SortableItem>
                            ) : (
                              <span className="text-muted-foreground">Empty Slot (span {slot.colspan})</span>
                            )}
                          </div>
                        </Droppable>
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <DragOverlay>
          {draggedItem && (
            <div 
              style={{
                transform: CSS.Transform.toString({
                  x: 0,
                  y: 0,
                  scaleX: 1.05,
                  scaleY: 1.05,
                }),
              }}
              className="p-2 bg-card rounded-md shadow cursor-move opacity-90 border-2 border-primary z-50"
            >
              <ChartItem config={draggedItem} data={chartData} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}