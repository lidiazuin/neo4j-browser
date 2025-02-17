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
import {
  Simulation,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY
} from 'd3-force'

import {
  DEFAULT_ALPHA,
  DEFAULT_ALPHA_MIN,
  FORCE_CENTER_X,
  FORCE_CENTER_Y,
  FORCE_CHARGE,
  FORCE_COLLIDE_RADIUS,
  FORCE_LINK_DISTANCE,
  LINK_DISTANCE,
  PRECOMPUTED_TICKS,
  TICKS_PER_RENDER,
  VELOCITY_DECAY
} from '../../../constants'
import { GraphModel } from '../../../models/Graph'
import { NodeModel } from '../../../models/Node'
import { RelationshipModel } from '../../../models/Relationship'
import circularLayout from './utils/circularLayout'

const oneRelationshipPerPairOfNodes = (graph: GraphModel) =>
  Array.from(graph.groupedRelationships()).map(pair => pair.relationships[0])

export class ForceSimulation {
  simulation: Simulation<NodeModel, RelationshipModel>
  simulationTimeout: null | number = null
  endSimulationCallback: null | (() => void) = null

  constructor(private render: () => void) {
    this.simulation = forceSimulation<NodeModel, RelationshipModel>()
      .velocityDecay(VELOCITY_DECAY)
      .force('charge', forceManyBody().strength(FORCE_CHARGE))
      .force('centerX', forceX(0).strength(FORCE_CENTER_X))
      .force('centerY', forceY(0).strength(FORCE_CENTER_Y))
      .on('tick', () => {
        this.simulation.tick(TICKS_PER_RENDER)
        render()
      })
      .on('end', () => {
        this.endSimulationCallback && this.endSimulationCallback()
        this.endSimulationCallback = null
      })
      .stop()
  }

  updateNodes(graph: GraphModel): void {
    const nodes = graph.nodes()

    const radius = (nodes.length * LINK_DISTANCE) / (Math.PI * 2)
    const center = {
      x: 0,
      y: 0
    }
    circularLayout(nodes, center, radius)

    this.simulation
      .nodes(nodes)
      .force('collide', forceCollide<NodeModel>().radius(FORCE_COLLIDE_RADIUS))
  }

  updateRelationships(graph: GraphModel): void {
    const relationships = oneRelationshipPerPairOfNodes(graph)

    this.simulation.force(
      'link',
      forceLink<NodeModel, RelationshipModel>(relationships)
        .id(node => node.id)
        .distance(FORCE_LINK_DISTANCE)
    )
  }

  precompute(): void {
    this.simulation.stop().tick(PRECOMPUTED_TICKS)
    this.render()
  }

  restart(): void {
    this.simulation.alphaMin(DEFAULT_ALPHA_MIN).alpha(DEFAULT_ALPHA).restart()
  }
}
