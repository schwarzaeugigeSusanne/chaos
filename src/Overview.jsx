
/* eslint-disable class-methods-use-this, react/prop-types, func-names */
import React, { Component } from 'react';
import * as d3 from 'd3';
import { isTodo } from './MainService.jsx';

const OVERVIEW_WIDTH = 960;
const ITEM_MIN_AREA = 400 * 400;
const CLIP_PATH_ID_PREFIX = 'clipPath-';
const POLYGON_ID_PREFIX = 'polygon-';

export class Overview extends Component {
    constructor(props) {
        super(props);

        this.svg = null;
        this.visCard = null;
        this.voronoi = null;
        this.polygon = null;
        this.polygons = null;
        this.site = null;
        this.sites = null;
        this.centroids = null;
        this.label = null;
        this.image = null;
        this.visInfo = this.props.visInfo;
        this.count = this.visInfo.length;
    }

    componentDidMount = () => {
        const overview = this;

        this.svg = d3.select('svg');
        const width = +this.svg.attr('width');
        const height = +this.svg.attr('height');

        this.sites = d3.range(this.count)
            .map(() => [Math.random() * width, Math.random() * height]);

        this.voronoi = d3.voronoi()
            .extent([[-1, -1], [width + 1, height + 1]]);

        this.polygons = this.voronoi.polygons(this.sites);
        this.centroids = this.polygons.map(d => d3.polygonCentroid(d));

        this.svg.append('defs')
            .selectAll('clipPath')
            .data(this.polygons)
            .enter()
            .append('clipPath')
            .attr('id', (d, i) => this.getClipPathAt(i))
            .append('path')
            .attr('d', d => (d ? `M${d.join('L')}Z` : null));

        this.svg.select('defs')
            .append('filter')
            .attr('id', 'blur-filter')
            .append('feGaussianBlur')
            .attr('in', 'SourceGraphic')
            .attr('stdDeviation', '2');


        this.visCard = this.svg.append('g')
            .attr('class', 'visCard')
            .selectAll('g')
            .data(this.polygons)
            .enter()
            .append('g');

        // images have to be append before polygons
        this.image = this.visCard.append('g')
            .classed('background-images', true)
            .append('g')
            .attr('clip-path', (d, i) => `url(#${CLIP_PATH_ID_PREFIX}${i})`)
            .append('image')
            .attr('xlink:href', (d, i) => this.getImagePathAt(i));

        this.polygon = this.visCard.append('g')
            .attr('class', 'polygons')
            .append('path')
            .call(this.drawPolygon);

        this.polygon.each(function (d, i) {
            this.id = `${POLYGON_ID_PREFIX}${i}`;
            this.visInfo = overview.visInfo[i];
        });

        this.label = this.visCard.append('g')
            .attr('class', 'labels')
            .append('a')
            .classed('todo', (d, i) => isTodo(this.getDescriptionAt(i)))
            .attr('xlink:href', (d, i) => this.getRoutePathAt(i))
            .append('text')
            .attr('x', 0)
            .attr('y', -120)
            .text((d, i) => this.getTitleAt(i))
            .append('tspan')
            .attr('x', 0)
            .attr('y', -100)
            .text((d, i) => this.getDescriptionAt(i));

        this.setTextTransformations();

        // Need to wait for polygons to be ready to get their bbox
        this.setImageTransformations();
    }

    getVisInfoAt = i => this.visInfo[i]

    getClipPathAt = i => `${CLIP_PATH_ID_PREFIX}${i}`

    getImagePathAt = (i) => {
        const vis = this.getVisInfoAt(i);
        return vis.imagePath ? `${vis.imagePath}` : null;
    }

    getRoutePathAt = (i) => {
        const vis = this.getVisInfoAt(i);
        return vis.path ? vis.path : null;
    }

    getDescriptionAt = (i) => {
        const vis = this.getVisInfoAt(i);
        return vis.description;
    }

    getTitleAt = (i) => {
        const vis = this.getVisInfoAt(i);
        return vis.title;
    }

    setTextTransformations = () => {
        const self = this;

        this.svg.selectAll('text')
            .attr('transform', function (d, i) {
                const centroid = self.centroids[i];
                const bb = this.getBBox();
                const textCenter = {
                    x: bb.x + (bb.width / 2),
                    y: bb.y + (bb.height / 2),
                };

                const transform = {
                    x: centroid[0] - textCenter.x,
                    y: centroid[1] - textCenter.y,
                };

                return `translate(${transform.x} ${transform.y})`;
            });
    }


    setImageTransformations = () => {
        this.image.attr('transform', (d, i) => {
            const vis = this.visInfo[i];
            if (vis.imagePath) {
                const bbox = d3.select(`#${POLYGON_ID_PREFIX}${i}`).node().getBBox();
                const scaleX = bbox.width / vis.imageWidth;
                const scaleY = bbox.height / vis.imageHeight;
                const scale = Math.max(scaleX, scaleY);
                return `translate(${bbox.x},${bbox.y})scale(${scale})`;
            }
            return null;
        });
    }

    getHeight = () => {
        const height = (ITEM_MIN_AREA * this.count) / OVERVIEW_WIDTH;
        return Math.round(height);
    }

    handleMouseOver = (d, i, all) => {
        const current = all[i];

        d3.selectAll('path')
            .style('fill', 'black')
            .style('fill-opacity', 0.05);

        if (!isTodo(current.visInfo.description)) {
            d3.select(current)
                .style('fill', 'red')
                .style('fill-opacity', 0.1);
        } else {
            d3.select(current)
                .style('fill-opacity', 0.2);
        }

        this.image
            .classed('hoverEffect', (data, index) => index === i);
    }

    drawPolygon = (polygon) => {
        polygon
            .attr('d', d => (d ? `M${d.join('L')}Z` : null))
            .on('mouseover', this.handleMouseOver);
    }

    render() {
        return (
            <section className="overview">
                <svg width={OVERVIEW_WIDTH} height={this.getHeight()} />
            </section>
        );
    }
}
