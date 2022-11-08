using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.AI; //for NavMeshAgent

/// <summary>
/// this scriot is responsible for random movements of players
/// </summary>
public class PlayerRandomMovement : MonoBehaviour
{
    private NavMeshAgent nma = null;//nav mesh for AI movement
    private GameObject[] RandomPoint;//ranfom points from inspector
    private int CurrentRandom;//for random number storage

    private void Start()
    {
        nma = this.GetComponent<NavMeshAgent>();//getting navmeshagent for ai
        RandomPoint = GameObject.FindGameObjectsWithTag("randomPoint");// find random positions on our scene
    }

    private void Update()
    {
        if (nma.hasPath == false)
        {
            CurrentRandom = Random.Range(0, RandomPoint.Length );//check for the random position on ground
            nma.SetDestination(RandomPoint[CurrentRandom].transform.position);// move on random positions
        }
    }
}