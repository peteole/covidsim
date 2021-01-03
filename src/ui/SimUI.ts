import { Person } from "../logic/Person";
import { Simulation } from "../logic/Simulation";
import { TimelineElement } from "./TimelineElement";

import { html, LitElement } from "lit-element";


export class SimUI extends LitElement {
    /**number of pixels per day in x direction */
    scale: number = 100;
    simulation: Simulation;
    timelineElements: TimelineElement[] = [];
    constructor(initialDate: Date) {
        super();
        this.simulation = new Simulation(initialDate);
    }
    render() {
        return html`
            <h1>simulation</h1>
        `;
    }
}