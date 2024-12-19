

def getCommunesObservationsChildsMailles(connection, cd_ref):
    sql = """
    SELECT DISTINCT (com.insee) AS insee, com.commune_maj
        FROM atlas.vm_communes com
        JOIN atlas.t_mailles_territoire m ON st_intersects(m.the_geom, com.the_geom)
        JOIN atlas.vm_observations_mailles obs ON m.id_maille=obs.id_maille
        WHERE obs.cd_ref in (
                SELECT * from atlas.find_all_taxons_childs(:thiscdref)
            )
            OR obs.cd_ref = :thiscdref
        ORDER BY com.commune_maj ASC
    """
    req = connection.execute(text(sql), thiscdref=cd_ref)
    listCommunes = list()
    for r in req:
        temp = {"insee": r.insee, "commune_maj": r.commune_maj}
        listCommunes.append(temp)
    return listCommunes
