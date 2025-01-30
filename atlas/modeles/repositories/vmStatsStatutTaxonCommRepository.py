# -*- coding:utf-8 -*-

from sqlalchemy.sql import text


# get nombre taxons protégés et nombre taxons patrimoniaux par communes
def get_nb_taxon_pro_pat_area(connection, list_id_observation):
    sql = """
SELECT DISTINCT o.id_observation,
    COUNT(t.patrimonial) AS nb_taxon_patrimonial, COUNT(t.protection_stricte) AS nb_taxon_protege
FROM atlas.vm_observations o
         JOIN atlas.vm_taxons t ON t.cd_ref=o.cd_ref
WHERE o.id_observation = ANY(:id_observations)
GROUP BY o.id_observation
    """
    req = connection.execute(text(sql), id_observations=list_id_observation)
    taxonProPatri = dict()
    for r in req:
        taxonProPatri = {"nbTaxonPro": r.nb_taxon_protege, "nbTaxonPatri": r.nb_taxon_patrimonial}
    return taxonProPatri
