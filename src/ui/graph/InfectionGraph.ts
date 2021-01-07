
import { LitElement, html, property, customElement, css } from "lit-element";
import { Simulation } from "../../logic/Simulation";
import Dygraph from "dygraphs";
import { TimelineElement } from "../TimelineElement";
import { SimUI } from "../SimUI";
import { Person } from "../../logic/Person";
import { serializeSimulation } from "../../logic/simulationSerialization";

export function isSimulationResult(res: any): res is {
    array: {
        date: Date;
        values: number[];
    }[];
    persons: Person[];
} {
    if (res["array"]) {
        if (res.array.length && res.array.length > 0) {
            const firstEl = res.array[0];
            if (firstEl.date)
                return true;
        }
    }
    return false;
}
@customElement("infection-graph")
export class InfectionGraph extends TimelineElement {
    worker: Worker|null=null;
    static get styles() {
        return css`
        #window{
            width:100%;
            overflow-x:auto;
        }
        #dg{
            width:100%;
        }
        `
    }
    onScaleChange(newScale: number): void {
        this.requestUpdate();
        //this.simulate(null);
    }
    onDateChange(newDateBeginning: Date): void {
        //const newScrollingPosition = (newDateBeginning.getTime() - this.simulation.initialDate.getTime()) * this.scale / 1000 / 60 / 60 / 24;
        //this.window.scrollTo(newScrollingPosition, 0);
        if (this.graph) {
            this.triggeredOutside = true;
            const endDate = new Date(newDateBeginning.getTime() + this.window.clientWidth / this.scale * 1000 * 60 * 60 * 24);
            this.graph.updateOptions({
                dateWindow: [newDateBeginning.getTime(), endDate.getTime()]
            })
        }
    }
    simui: SimUI;
    simulation: Simulation;
    window: HTMLDivElement | null;
    graph: Dygraph | null = null;
    triggeredOutside: boolean = false;
    constructor(simui: SimUI) {
        super();
        this.simui = simui;
        this.simulation = simui.simulation;
    }
    updated() {
        this.window = <HTMLDivElement>this.shadowRoot.getElementById("window");
    }
    render() {
        return html`
        <div id="window">
            <div id="dg"></div>
        </div>
        `
    }
    simulate(ev: Event) {
        if(this.worker){
            this.worker.terminate();
        }
        this.worker = new Worker("worker.js");
        this.worker.postMessage(serializeSimulation(this.simui.simulation));
        this.worker.onmessage = (ev) => {
            if (isSimulationResult(ev.data)) {
                const list = ev.data;
                this.graph.updateOptions({
                    file: list.array.map((val) => [val.date, ...val.values])
                });
            }
        }
        //const result = this.simulation.simulate(this.simui.simRuns);
        //const list = Simulation.toArray(result, this.simui.showInterval, this.simulation.lastDate.getTime());
        const resultPersons = this.simui.simulation.personArray;
        const list = [{ date: this.simui.simulation.initialDate, values: resultPersons.map((p) => 0) }];
        const graphDiv = this.shadowRoot.getElementById("dg");
        graphDiv.style.width = "100%";//((this.simulation.lastDate.getTime() - this.simulation.initialDate.getTime()) * this.scale / 1000 / 60 / 60 / 24) + "px";
        this.graph = new Dygraph(graphDiv, list.map((val) => [val.date, ...val.values]), {
            labels: ["date", ...resultPersons.map(person => person.name)],
            legend: "always",
            panEdgeFraction: 0,
            underlayCallback: (ctx, area, g) => {
                const range = g.xAxisRange();
                const newInitialDate = new Date(range[0]);
                if (this.triggeredOutside) {
                    this.triggeredOutside = false;
                    return;
                }
                window.requestAnimationFrame(() => {
                    this.simui.setScrollingDate(newInitialDate, this);
                });
            },
            zoomCallback: (mindate, maxdate, yranges) => {
                const dateRange = (maxdate - mindate) / 1000 / 60 / 60 / 24;
                const newScale = this.window.clientWidth / dateRange;
                this.simui.setScale(newScale, new Date(mindate), this);
            }
        });
        this.onDateChange(this.simulation.initialDate);
    }
}