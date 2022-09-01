/**
 *
 */
class Element {
    constructor(name, crit = [], half = []) {
        this.name = name;
        this.crit = crit;
        this.half = half;
    }

    addHalfDmg(half) {
        this.half.push(half);
        return this;
    }

    addCrit(s) {
        this.crit.push(s);
        return this;
    }
}

const elements = [
    new Element("terra", ["electric", "flame"], ["metal", "war"]),
    new Element("flame", ["nature", "ice"], ["sea", "war"]),
    new Element("sea", ["flame", "war"], ["nature", "electric"]),
    new Element("nature", ["light", "sea"], ["flame", "ice"]),
    new Element("electric", ["sea", "metal"], ["terra", "light"]),
    new Element("ice", ["nature", "war"], ["flame", "metal"]),
    new Element("metal", ["terra", "ice"], ["dark", "electric"]),
    new Element("dark", ["metal", "light"], ["terra"]),
    new Element("light", ["electric", "dark"], ["nature"]),
    new Element("war", ["terra", "dark"], ["sea", "ice"]),
    new Element("pure", ["wind"], ["primal"]),
    new Element("legend", ["primal"], ["pure"]),
    new Element("primal", ["pure"], ["time"]),
    new Element("wind", ["time"], ["legend"]),
    new Element("time", ["legend"], ["wind"]),

    new Element("happy", ["chaos", "magic"]),
    new Element("chaos", ["magic", "soul"]),
    new Element("magic", ["soul", "beauty"]),
    new Element("soul", ["beauty", "dream"]),
    new Element("beauty", ["dream", "happy"]),
    new Element("dream", ["happy", "chaos"]),
];

function getCritiable(dragonElements) {
    if (!(dragonElements instanceof Array || dragonElements instanceof Set))
        dragonElements = [dragonElements];

    const critable = new Set();

    for (const dragonElement of dragonElements) {
        for (const e of elements) {
            if (e.name == dragonElement) {
                for (const temp of e.crit) critable.add(temp);
            }
        }
    }

    return critable;
}

function getWeakness(defendingElement) {
    const weakness = new Set();
    for (const e of elements) {
        for (const strong of e.crit) {
            if (strong == defendingElement) {
                weakness.add(e.name);
            }
        }
    }
    return weakness;
}