import { css, LitElement, property } from "lit-element";

export abstract class TimelineElement extends LitElement {
    static get styles(){
        return css`
            :host{
                width:100%;
            }
        `
    }
    @property({
        attribute: true,
        type: Number
    })
    scale: number = 100
    @property({ attribute: true, type: Number })
    width: number
    /**fires when the x scale changes. Adopt element sizes. */
    abstract onScaleChange(newScale: number): void;
    /** fires when the first date to be shown is changed (x scrolling) */
    abstract onDateChange(newDateBeginning: Date): void;
}