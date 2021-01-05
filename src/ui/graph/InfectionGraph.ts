
import { LitElement, html, property, customElement, css } from "lit-element";
import { Simulation } from "../../logic/Simulation";
import Dygraph from "dygraphs";
import { TimelineElement } from "../TimelineElement";
import { SimUI } from "../SimUI";
import { Person } from "../../logic/Person";

@customElement("infection-graph")
export class InfectionGraph extends TimelineElement {
    static get styles() {
        return css`
        #dg{
            width:100%;
        }
        `
    }
    onScaleChange(newScale: number): void {
        throw new Error("Method not implemented.");
    }
    onDateChange(newDateBeginning: Date): void {
        throw new Error("Method not implemented.");
    }
    simui: SimUI;
    simulation: Simulation;
    constructor(simui: SimUI) {
        super();
        this.simui = simui;
        this.simulation = simui.simulation;
    }
    render() {
        return html`
        <div id="dg"></div>
        <button @click=${this.simulate}>simulate</button>
        `
    }
    /**
     * 
     * @param result - simulation result
     * @param resolution - distance betweeen two timesteps in days
     */
    static toArray(result: {
        initialDate: Date;
        totalInfectionProbability: Map<Person, number>;
        infectionTimeline: Map<Person, {
            date: Date;
            p: number;
            pAcc: number;
        }[]>;
    }, resolution: number, lastDate: number) {
        const personArray = new Array(...result.infectionTimeline.keys());
        const list: { date: Date, values: number[] }[] = []
        const indices = personArray.map((person) => 0);
        for (let date = result.initialDate; date.getTime() < lastDate; date = new Date(date.getTime() + resolution * 1000 * 60 * 60 * 24)) {
            const newValues = new Array(personArray.length);
            for (let i = 0; i < personArray.length; i++) {
                const person = personArray[i];
                const personValues = result.infectionTimeline.get(person);
                let index = indices[i];
                while (index < personValues.length && personValues[index].date < date)
                    index++;
                indices[i] = index;
                newValues[i] = personValues[index].pAcc;
            }
            list.push({ date: date, values: newValues });
        }
        return list;
    }
    simulate(ev: Event) {
        const result = this.simulation.simulate(100000);
        const resultPersons = result.totalInfectionProbability.keys();
        let csv = "date,";
        for (let person of resultPersons)
            csv += person.name + ","
        const list = InfectionGraph.toArray(result, 0.5, this.simulation.lastDate.getTime());
        csv += "\n";
        for (let datapoint of list) {
            csv += datapoint.date.toDateString() + ",";
            for (let personvalue of datapoint.values) {
                csv += personvalue + ","
            }
            csv += "\n";
        }
        const graph = new Dygraph(this.shadowRoot.getElementById("dg"), csv);
    }
}