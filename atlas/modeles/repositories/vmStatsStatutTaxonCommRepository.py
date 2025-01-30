# -*- coding:utf-8 -*-

from sqlalchemy.sql import text


# get nombre taxons protégés et nombre taxons patrimoniaux par communes
def get_nb_taxon_pro_pat_area(connection, id_area):
    sql = """
WITH obs_in_area AS (
        SELECT DISTINCT obs.id_observation
        FROM atlas.vm_cor_area_synthese AS cas
                 JOIN atlas.vm_observations obs ON cas.id_synthese = obs.id_observation
        WHERE cas.id_area = :idAreaCode
)
SELECT DISTINCT o.id_observation,
    COUNT(t.patrimonial) AS nb_taxon_patrimonial, COUNT(t.protection_stricte) AS nb_taxon_protege
FROM obs_in_area oia 
     JOIN atlas.vm_observations o ON o.id_observation = oia.id_observation
     JOIN atlas.vm_taxons t ON t.cd_ref=o.cd_ref
GROUP BY o.id_observation
    """
    req = connection.execute(text(sql), idAreaCode=id_area)
    taxonProPatri = dict()
    for r in req:
        taxonProPatri = {"nbTaxonPro": r.nb_taxon_protege, "nbTaxonPatri": r.nb_taxon_patrimonial}
    return taxonProPatri
