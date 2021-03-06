import { Person } from "../logic/Person";
import { Simulation } from "../logic/Simulation";
import { TimelineElement } from "./TimelineElement";

import { css, customElement, html, LitElement } from "lit-element";
import { Eventline } from "./eventline/Eventline";
import { Contact } from "../logic/Contact";
import { Settings } from "./settings/Settings";
import { InfectionGraph } from "./graph/InfectionGraph";

@customElement("sim-ui")
export class SimUI extends LitElement {
    static get styles() {
        return css`
            footer{
                text-align:center;
            }
            :host{
                display:flex;
                flex-direction:column;
                height:100%;
            }
        `
    }

    /**number of pixels per day in x direction */
    scale: number = 100;
    simulation: Simulation;
    timelineElements: TimelineElement[] = [];
    eventline: Eventline;
    graph: InfectionGraph;
    accuracy:number=0.0001;
    resolution: number = 0.1;
    constructor(initialDate: Date,simulation:Simulation=new Simulation(initialDate)) {
        super();
        this.simulation = simulation;
        this.graph = new InfectionGraph(this);
        this.timelineElements.push(this.graph);
        this.eventline = new Eventline(this);
        this.timelineElements.push(this.eventline);
    }
    render() {
        return html`
            ${this.timelineElements}
            <footer>
                <p><button @click=${() => document.body.appendChild(new Settings(this))}>Settings</button></p>
                <p>Source code: <a href="https://github.com/peteole/covidsim">https://github.com/peteole/covidsim</a></p>
            </footer>
        `;
    }
    setScrollingDate(newDate: Date, toOmit: TimelineElement) {
        for (let el of this.timelineElements) {
            if (toOmit != el)
                el.onDateChange(newDate);
        }
    }
    setScale(newScale: number, newFirstDate: Date, toOmit: TimelineElement) {

        for (let el of this.timelineElements) {
            el.scale = newScale;
            if (toOmit != el)
                el.onScaleChange(newScale);
        }
        this.setScrollingDate(newFirstDate, toOmit);
    }
}