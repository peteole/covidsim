import { Person } from "../logic/Person";
import { Simulation } from "../logic/Simulation";
import { TimelineElement } from "./TimelineElement";

import { customElement, html, LitElement } from "lit-element";
import { Eventline } from "./eventline/Eventline";
import { Contact } from "../logic/Contact";

@customElement("sim-ui")
export class SimUI extends LitElement {
    /**number of pixels per day in x direction */
    scale: number = 100;
    simulation: Simulation;
    timelineElements: TimelineElement[] = [];
    eventline: Eventline;
    constructor(initialDate: Date) {
        super();
        this.simulation = new Simulation(initialDate);
        this.eventline = new Eventline(this.simulation);
        this.timelineElements.push(this.eventline);
    }
    render() {
        return html`
            ${this.timelineElements}
        `;
    }
}