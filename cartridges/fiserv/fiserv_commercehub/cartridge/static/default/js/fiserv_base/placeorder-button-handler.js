'use strict';

class PlaceOrderButtonHandler
{
    constructor(buttonElement)
    {
        this.button = buttonElement;
        this.facts = {};
        this.blockers = new Map();
        this.pending = false;
    }

    setFact = function(key, value)
    {
        this.facts[key] = value;
        this.schedule();
    }

    deleteFact = function(key)
    {
        delete this.facts[key];
        this.schedule();
    }

    getFact = function(key)
    {
        return this.facts[key];
    }

    addBlocker = function(ownerId, id, whenFn, reasonFn, category)
    {
        this.blockers.set(id, {
            ownerId: ownerId,
            whenFn: whenFn,
            reasonFn: reasonFn || function() { return ''; },
            category: category || null
        });
        this.schedule();
    }

    removeBlocker = function(id)
    {
        this.blockers.delete(id);
        this.schedule();
    }

    schedule = function()
    {
        if (this.pending) return;
        this.pending = true;
        queueMicrotask(() =>
        {
            this.pending = false;
            this.recompute();
        });
    }

    buildDerivedFacts = function(facts)
    {
        let grandTotal = typeof facts['totals.grandTotal'] === 'number' ? facts['totals.grandTotal'] : null;
        let giftAmount = typeof facts['coverage.giftAmount'] === 'number' ? facts['coverage.giftAmount'] : 0;

        if (grandTotal !== null)
        {
            facts['totals.amountDue'] = Math.max(0, grandTotal - giftAmount);
            facts['coverage.giftCoversAll'] = facts['totals.amountDue'] === 0;
        }

        facts['payment.required'] = facts['coverage.giftCoversAll'] === true ? false : true;
    }

    recompute = function()
    {
        let facts = Object.assign({}, this.facts);
        this.buildDerivedFacts(facts);

        let disabled = false;
        for (const [, blocker] of this.blockers)
        {
            try
            {
                if (blocker.whenFn(facts))
                {
                    disabled = true;
                    break;
                }
            }
            catch (err)
            {
                disabled = true;
                break;
            }
        }

        this.button.disabled = disabled;
    }
}
