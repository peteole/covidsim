

/**
 * Class representing persons in the real world.
 */
export class Person {
    /**
     * 
     * @param {(date:Date)=>number} externalActivity - estimate for the number of not logged contacts of the person per day, probability of infection included (2 contacts per day with 0.5 infection probability result in a value of 1).
     */
    constructor(externalActivity=date=>0.5) {
        this.externalActivity=externalActivity;
    }
    getInfectionProbability(date=new Date()) {
        return this.initialInfectionRisk;
    }
}