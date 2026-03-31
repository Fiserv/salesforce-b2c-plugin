'use strict';

class DomElementDisableHandler
{
    constructor()
    {
        this.button = $('button.btn.btn-primary.btn-block.submit-payment')[0];
        this.categoryIdentifier = () => $('.tab-pane.active').find('input[name=dwfrm_billing_paymentMethod]').val();
        this.facts = new Map();
        this.blockers = new Map();
    }

    setFact = function(key, value)
    {
        this.facts.set(key, value);
        this.recompute();
    }

    getFact = function(key)
    {
        // Deals with undefined cases, don't worry about it...
        return this.facts.get(key) ? true : false;
    }

    addBlocker = function(category, id, blockerCondition)
    {
        if (!this.blockers.has(category))
        {
            this.blockers.set(category, new Map());
        }

        this.blockers.get(category).set(id, {
            blockerCondition: blockerCondition
        });
        this.recompute();
    }

    removeBlocker = function(id)
    {
        for (const categoryMap of this.blockers.values())
        {
            if (categoryMap.has(id))
            {
                categoryMap.delete(id);
                break;
            }
        }
        this.recompute();
    }

    recompute = function()
    {
        const category = this.categoryIdentifier();
        const relevantBlockers = [
            ...(this.blockers.get(category)?.values() ?? []),
            ...(this.blockers.get('NO_CAT_:3')?.values() ?? [])
        ];

        this.button.disabled = relevantBlockers.some(blocker => {
            return blocker.blockerCondition(this);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.fiservSubmitButtonHandler = new DomElementDisableHandler();
});
