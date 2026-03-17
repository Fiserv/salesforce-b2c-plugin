'use strict';

class PlaceOrderButtonHandler
{
    constructor(buttonElement)
    {
        this.button = buttonElement;
        this.facts = new Map();
        this.blockers = new Map();
        this.pending = false;
    }

    setFact = function(key, value)
    {
        this.facts.set(key, value);
        this.schedule();
    }

    deleteFact = function(key)
    {
        this.facts.delete(key);
        this.schedule();
    }

    getFact = function(key)
    {
        return this.facts.get(key);
    }

    addBlocker = function(ownerId, id, shouldBlockFn)
    {
        this.blockers.set(id, {
            ownerId: ownerId,
            shouldBlockFn: shouldBlockFn
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
        let grandTotal = typeof facts.get('totals.grandTotal') === 'number' ? facts.get('totals.grandTotal') : null;
        let giftAmount = typeof facts.get('coverage.giftAmount') === 'number' ? facts.get('coverage.giftAmount') : 0;

        if (grandTotal !== null)
        {
            const amountDue = Math.round(Math.max(0, grandTotal - giftAmount) * 100) / 100;
            facts.set('totals.amountDue', amountDue);
            facts.set('coverage.giftCoversAll', amountDue === 0);
        }

        facts.set('payment.required', !facts.get('coverage.giftCoversAll'));
    }

    recompute = function()
    {
        let facts = new Map(this.facts);
        this.buildDerivedFacts(facts);

        let disabled = false;
        for (const [, blocker] of this.blockers)
        {
            try
            {
                if (blocker.shouldBlockFn(facts))
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
