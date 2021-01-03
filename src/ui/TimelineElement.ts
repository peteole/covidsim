import { LitElement } from "lit-element";

export abstract class TimelineElement extends LitElement {
    /**fires when the x scale changes. Adopt element sizes. */
    abstract onScaleChange(newScale: number): void;
    /** fires when the first date to be shown is changed (x scrolling) */
    abstract onDateChange(newDateBeginning: Date): void;
}