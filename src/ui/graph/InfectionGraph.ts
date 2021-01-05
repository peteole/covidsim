
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
        #window{
            width:100%;
            overflow-x:auto;
        }
        `
    }
    onScaleChange(newScale: number): void {
        this.requestUpdate();
        this.simulate(null);
    }
    onDateChange(newDateBeginning: Date): void {
        const newScrollingPosition = (newDateBeginning.getTime() - this.simulation.initialDate.getTime()) * this.scale / 1000 / 60 / 60 / 24;
        this.window.scrollTo(newScrollingPosition, 0);
    }
    simui: SimUI;
    simulation: Simulation;
    window: HTMLDivElement | null;
    constructor(simui: SimUI) {
        super();
        this.simui = simui;
        this.simulation = simui.simulation;
    }
    updated() {
        this.window = <HTMLDivElement>this.shadowRoot.getElementById("window");
        this.window.onscroll = (ev) => {
            requestAnimationFrame((time) => {
                this.simui.setScrollingDate(new Date(this.window.scrollLeft / this.scale * 1000 * 60 * 60 * 24 + this.simulation.initialDate.getTime()), this)
            })
        }
    }
    render() {
        return html`
        <div id="window">
            <div id="dg"></div>
        </div>
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
                while (index + 1 < personValues.length && personValues[index].date < date)
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
        const list = InfectionGraph.toArray(result, 0.5, this.simulation.lastDate.getTime());
        const graphDiv = this.shadowRoot.getElementById("dg");
        const resultPersons = new Array(...result.totalInfectionProbability.keys());
        graphDiv.style.width = ((this.simulation.lastDate.getTime() - this.simulation.initialDate.getTime()) * this.scale / 1000 / 60 / 60 / 24) + "px";
        const graph = new Dygraph(graphDiv, list.map((val) => [val.date, ...val.values]), {
            labels: ["date", ...resultPersons.map(person => person.name)],
            panEdgeFraction:0
        });
    }
}