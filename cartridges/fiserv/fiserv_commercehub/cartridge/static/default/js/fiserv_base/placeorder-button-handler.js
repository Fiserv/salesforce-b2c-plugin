'use strict';

class PlaceOrderButtonHandler
{
    constructor()
    {
        this.button = $('button.btn.btn-primary.btn-block.submit-payment')[0];
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
        return this.facts.get(key);
    }

    addBlocker = function(ownerId, id, blockerCondition)
    {
        this.blockers.set(id, {
            ownerId: ownerId,
            blockerCondition: blockerCondition
        });
        this.recompute();
    }

    removeBlocker = function(id)
    {
        this.blockers.delete(id);
        this.recompute();
    }

    

    recompute = function()
    {
        const facts = new Map(this.facts);

        const grandTotal = typeof facts.get('totals.grandTotal') === 'number' ? facts.get('totals.grandTotal') : null;
        const giftAmount = typeof facts.get('coverage.giftAmount') === 'number' ? facts.get('coverage.giftAmount') : 0;

        if (grandTotal !== null)
        {
            const amountDue = Math.round(Math.max(0, grandTotal - giftAmount) * 100) / 100;
            facts.set('totals.amountDue', amountDue);
            facts.set('coverage.giftCoversAll', amountDue === 0);
        }

        facts.set('payment.required', !facts.get('coverage.giftCoversAll'));

        this.button.disabled = [...this.blockers.values()].some(blocker => {
            try { return blocker.blockerCondition(facts); }
            catch { return true; }
        });
    }
}
