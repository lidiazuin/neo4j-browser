/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Neo4j is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import React from 'react'

import {
  BasicNode,
  BasicRelationship,
  ZoomInIcon,
  ZoomOutIcon,
  ZoomToFitIcon
} from '../../../common'

import { GraphModel } from '../../models/Graph'
import {
  GraphEventHandlerModel,
  GraphInteractionCallBack
} from './GraphEventHandlerModel'
import { GraphStyleModel } from '../../models/GraphStyle'
import {
  GetNodeNeighboursFn,
  VizItem,
  ZoomLimitsReached,
  ZoomType
} from '../../types'
import {
  GraphStats,
  createGraph,
  getGraphStats,
  mapRelationships
} from '../../utils/mapper'
import { Visualization } from './visualization/Visualization'
import { WheelZoomInfoOverlay } from './WheelZoomInfoOverlay'
import { StyledSvgWrapper, StyledZoomButton, StyledZoomHolder } from './styled'

export type GraphProps = {
  isFullscreen: boolean
  relationships: BasicRelationship[]
  nodes: BasicNode[]
  getNodeNeighbours: GetNodeNeighboursFn
  onItemMouseOver: (item: VizItem) => void
  onItemSelect: (item: VizItem) => void
  graphStyle: GraphStyleModel
  styleVersion: number
  onGraphModelChange: (stats: GraphStats) => void
  assignVisElement: (svgElement: any, graphElement: any) => void
  getAutoCompleteCallback: (
    callback: (internalRelationships: BasicRelationship[]) => void
  ) => void
  setGraph: (graph: GraphModel) => void
  offset: number
  wheelZoomRequiresModKey?: boolean
  wheelZoomInfoMessageEnabled?: boolean
  disableWheelZoomInfoMessage: () => void
  initialZoomToFit?: boolean
  onGraphInteraction?: GraphInteractionCallBack
}

type GraphState = {
  zoomInLimitReached: boolean
  zoomOutLimitReached: boolean
  displayingWheelZoomInfoMessage: boolean
}

export class Graph extends React.Component<GraphProps, GraphState> {
  svgElement: React.RefObject<SVGSVGElement>
  visualization: Visualization | null = null

  constructor(props: GraphProps) {
    super(props)
    this.state = {
      zoomInLimitReached: false,
      zoomOutLimitReached: false,
      displayingWheelZoomInfoMessage: false
    }
    this.svgElement = React.createRef()
  }

  componentDidMount(): void {
    const {
      nodes,
      relationships,
      graphStyle,
      getNodeNeighbours,
      onItemMouseOver,
      onItemSelect,
      onGraphModelChange,
      onGraphInteraction,
      setGraph,
      getAutoCompleteCallback,
      assignVisElement,
      isFullscreen,
      wheelZoomRequiresModKey,
      initialZoomToFit
    } = this.props

    if (!this.svgElement.current) return

    const measureSize = () => ({
      width: this.svgElement.current?.parentElement?.clientWidth ?? 200,
      height: this.svgElement.current?.parentElement?.clientHeight ?? 200
    })

    const graph = createGraph(nodes, relationships)
    this.visualization = new Visualization(
      this.svgElement.current,
      measureSize,
      this.handleZoomEvent,
      this.handleDisplayZoomWheelInfoMessage,
      graph,
      graphStyle,
      isFullscreen,
      wheelZoomRequiresModKey
    )

    const graphEventHandler = new GraphEventHandlerModel(
      graph,
      this.visualization,
      getNodeNeighbours,
      onItemMouseOver,
      onItemSelect,
      onGraphModelChange,
      onGraphInteraction
    )
    graphEventHandler.bindEventHandlers()

    onGraphModelChange(getGraphStats(graph))
    this.visualization.resize(isFullscreen, !!wheelZoomRequiresModKey)
    this.visualization.init()

    if (setGraph) {
      setGraph(graph)
    }
    if (getAutoCompleteCallback) {
      getAutoCompleteCallback((internalRelationships: BasicRelationship[]) => {
        graph.addInternalRelationships(
          mapRelationships(internalRelationships, graph)
        )
        onGraphModelChange(getGraphStats(graph))
        this.visualization?.update({
          updateNodes: false,
          updateRelationships: true
        })
        graphEventHandler.onItemMouseOut()
      })
    }
    if (assignVisElement) {
      assignVisElement(this.svgElement.current, this.visualization)
    }

    if (initialZoomToFit) {
      this.visualization.endSimulationCallback = () => {
        setTimeout(() => {
          this.visualization?.zoomByType(ZoomType.FIT)
        }, 150)
      }
    }
  }

  componentDidUpdate(prevProps: GraphProps): void {
    if (this.props.isFullscreen !== prevProps.isFullscreen) {
      this.visualization?.resize(
        this.props.isFullscreen,
        !!this.props.wheelZoomRequiresModKey
      )
    }

    if (this.props.styleVersion !== prevProps.styleVersion) {
      this.visualization?.init()
    }
  }

  handleZoomEvent = (limitsReached: ZoomLimitsReached): void => {
    if (
      limitsReached.zoomInLimitReached !== this.state.zoomInLimitReached ||
      limitsReached.zoomOutLimitReached !== this.state.zoomOutLimitReached
    ) {
      this.setState({
        zoomInLimitReached: limitsReached.zoomInLimitReached,
        zoomOutLimitReached: limitsReached.zoomOutLimitReached
      })
    }
  }

  handleDisplayZoomWheelInfoMessage = (): void => {
    if (
      !this.state.displayingWheelZoomInfoMessage &&
      this.props.wheelZoomRequiresModKey &&
      this.props.wheelZoomInfoMessageEnabled
    ) {
      this.displayZoomWheelInfoMessage(true)
    }
  }

  displayZoomWheelInfoMessage = (display: boolean): void => {
    this.setState({ displayingWheelZoomInfoMessage: display })
  }

  zoomInClicked = (): void => {
    this.visualization?.zoomByType(ZoomType.IN)
  }

  zoomOutClicked = (): void => {
    this.visualization?.zoomByType(ZoomType.OUT)
  }

  zoomToFitClicked = (): void => {
    this.visualization?.zoomByType(ZoomType.FIT)
  }

  render(): JSX.Element {
    const {
      offset,
      isFullscreen,
      wheelZoomInfoMessageEnabled,
      disableWheelZoomInfoMessage
    } = this.props
    const {
      zoomInLimitReached,
      zoomOutLimitReached,
      displayingWheelZoomInfoMessage
    } = this.state
    return (
      <StyledSvgWrapper>
        <svg className="neod3viz" ref={this.svgElement} />
        <StyledZoomHolder offset={offset} isFullscreen={isFullscreen}>
          <StyledZoomButton
            aria-label={'zoom-in'}
            className={zoomInLimitReached ? 'faded zoom-in' : 'zoom-in'}
            onClick={this.zoomInClicked}
          >
            <ZoomInIcon large={isFullscreen} />
          </StyledZoomButton>
          <StyledZoomButton
            aria-label={'zoom-out'}
            className={zoomOutLimitReached ? 'faded zoom-out' : 'zoom-out'}
            onClick={this.zoomOutClicked}
          >
            <ZoomOutIcon large={isFullscreen} />
          </StyledZoomButton>
          <StyledZoomButton
            aria-label={'zoom-to-fit'}
            onClick={this.zoomToFitClicked}
          >
            <ZoomToFitIcon large={isFullscreen} />
          </StyledZoomButton>
        </StyledZoomHolder>
        {wheelZoomInfoMessageEnabled && displayingWheelZoomInfoMessage && (
          <WheelZoomInfoOverlay
            onDisableWheelZoomInfoMessage={disableWheelZoomInfoMessage}
          />
        )}
      </StyledSvgWrapper>
    )
  }
}
