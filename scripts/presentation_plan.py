"""Compute and reconcile the numbers used in the business presentation."""
from decimal import Decimal

def calculate_plan(model):
    keys=('player','institution','museum')
    unit_cost={key:sum(Decimal(str(v)) for v in model['unit_cost'][key].values()) for key in keys}
    scenarios=[]
    for scenario in model['scenarios']:
        revenue=sum(Decimal(scenario[key])*model['price'][key] for key in keys)
        direct=sum(Decimal(scenario[key])*unit_cost[key] for key in keys)
        calculated={'revenue':revenue,'contribution':revenue-direct,'balance':revenue-direct-model['fixed_cost']}
        for field,value in calculated.items():
            if Decimal(str(scenario[field]))!=value:
                raise ValueError(f"{scenario['name_en']} {field}: stored {scenario[field]}, calculated {value}")
        scenarios.append({**scenario,**{field:int(value) for field,value in calculated.items()},'direct_cost':int(direct)})
    budget={row['en']:row['amount'] for row in model['budget']}
    fixed=sum(budget[name] for name in ['Engineering','Content / review','Core operations'])
    if fixed!=model['fixed_cost']:
        raise ValueError('Budget fixed work differs from the operating model')
    funding_total=sum(budget.values())
    initial=model['initial_release']
    if not 0<initial<=funding_total:
        raise ValueError('Initial release must fit within the total cash plan')
    return {'base':next(s for s in scenarios if s['name_en']=='Base'),'scenarios':scenarios,
            'fixed_cost':fixed,'delivery_float':budget['Delivery float'],'reserve':budget['Contingency'],
            'funding_total':funding_total,'initial_release':initial,'remaining_release':funding_total-initial}
