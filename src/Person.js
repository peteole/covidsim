/**
 * @typedef {(date:Date)=>{contactDensity:number,contactIntensity:number}} untrackedActivity
 */

/**
 * Class representing persons in the real world.
 */
export class Person {
    /**
     * @param {string} name
     * @param {untrackedActivity} externalActivity - estimate for the number of not logged contacts of the person per day and their intensity
     */
    constructor(name,externalActivity = (date) => ({ contactDensity: 2, contactIntensity: 0.05 })) {
        this.externalActivity = externalActivity;
        this.name=name;
    }
    getInfectionProbability(date = new Date()) {
        return this.initialInfectionRisk;
    }
}